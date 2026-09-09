/**
 * טופס הזמנה → וואטסאפ + עדכון מלאי (כש-StockApi מחובר)
 */
(function () {
    const COLOR_OPTIONS = [
        { value: 'חום', hex: '#4a2f24' },
        { value: 'לבן', hex: '#e8e4dc' }
    ];

    const PAYMENT_OPTIONS = [
        { value: 'העברה בנקאית', label: 'העברה בנקאית' },
        { value: 'PayBox', label: 'PayBox' },
        { value: 'Bit', label: 'Bit' },
        { value: 'מזומן במסירה', label: 'מזומן במסירה' }
    ];

    const DEFAULT_ORIGIN = { name: 'באר יעקב', lat: 31.9386, lon: 34.8374 };
    const DEFAULT_DELIVERY = { basePrice: 400, includedKm: 40, extraPer10Km: 50 };

    let appConfig = null;
    let isSubmitting = false;
    let calculatedDistanceKm = null;
    let distanceCalcStatus = 'idle';
    let distanceCalcTimer = null;
    let distanceCalcRequestId = 0;
    let distanceIsApproximate = false;
    let zipManual = false;
    let lastAutofillZip = '';
    let zipLookupRequestId = 0;

    function $(sel) {
        return document.querySelector(sel);
    }

    function getDeliverySettings() {
        const cfg = (appConfig && appConfig.delivery) || {};
        const origin = cfg.origin || {};
        return {
            origin: {
                name: origin.name || DEFAULT_ORIGIN.name,
                lat: Number(origin.lat || DEFAULT_ORIGIN.lat),
                lon: Number(origin.lon || DEFAULT_ORIGIN.lon)
            },
            basePrice: Number(cfg.basePrice || DEFAULT_DELIVERY.basePrice),
            includedKm: Number(cfg.includedKm || DEFAULT_DELIVERY.includedKm),
            extraPer10Km: Number(cfg.extraPer10Km || DEFAULT_DELIVERY.extraPer10Km)
        };
    }

    function normalizePhone(raw) {
        return String(raw || '').replace(/\D/g, '').replace(/^972/, '').replace(/^0/, '');
    }

    function formatPhoneDisplay(raw) {
        const d = normalizePhone(raw);
        if (d.length === 9) {
            return '0' + d;
        }
        return raw;
    }

    function validatePhone(raw) {
        const d = normalizePhone(raw);
        return /^5\d{8}$/.test(d);
    }

    function normalizeZip(raw) {
        let digits = String(raw || '').replace(/\D/g, '');
        if (!digits) return '';
        if (digits.length < 7) {
            digits = digits.padStart(7, '0');
        }
        return digits.slice(0, 7);
    }

    function validateZip(raw) {
        return /^\d{7}$/.test(normalizeZip(raw));
    }

    function formatZipDisplay(raw) {
        const zip = normalizeZip(raw);
        return zip || '';
    }

    function getProductPrice() {
        if (appConfig && appConfig.discountPrice != null) {
            return Number(appConfig.discountPrice);
        }
        const el = document.querySelector('.current-price');
        if (el) {
            const n = Number(String(el.textContent).replace(/[^\d]/g, ''));
            if (n) return n;
        }
        return 8900;
    }

    function formatMoney(amount) {
        return '₪' + Number(amount).toLocaleString('he-IL');
    }

    function calcDeliveryCost(km) {
        const settings = getDeliverySettings();
        const distance = Number(km);
        if (!distance || distance <= 0) return null;
        if (distance <= settings.includedKm) return settings.basePrice;
        const extraBlocks = Math.ceil((distance - settings.includedKm) / 10);
        return settings.basePrice + extraBlocks * settings.extraPer10Km;
    }

    function formatDistance(km) {
        const n = Number(km);
        if (!n) return '';
        return (Math.round(n * 10) / 10).toLocaleString('he-IL');
    }

    function getAddressFields() {
        return {
            city: ($('#orderDelCity') && $('#orderDelCity').value.trim()) || '',
            street: ($('#orderDelStreet') && $('#orderDelStreet').value.trim()) || '',
            houseNumber: ($('#orderDelHouse') && $('#orderDelHouse').value.trim()) || '',
            apartment: ($('#orderDelApt') && $('#orderDelApt').value.trim()) || '',
            zip: normalizeZip(($('#orderDelZip') && $('#orderDelZip').value) || '')
        };
    }

    function hasCompleteAddress(fields) {
        return fields.city.length >= 2 &&
            fields.street.length >= 2 &&
            fields.houseNumber.length >= 1 &&
            validateZip(fields.zip);
    }

    function buildAddressFull(fields) {
        return [fields.street, fields.houseNumber, fields.apartment, fields.city, fields.zip]
            .filter(Boolean)
            .join(', ');
    }

    function setDistanceStatus(message, type) {
        const el = $('#orderDistanceStatus');
        if (!el) return;
        el.textContent = message || '';
        el.className = 'order-distance-status' + (type ? ' is-' + type : '');
    }

    function resetDistanceCalculation() {
        if (distanceCalcTimer) {
            clearTimeout(distanceCalcTimer);
            distanceCalcTimer = null;
        }
        distanceCalcRequestId += 1;
        calculatedDistanceKm = null;
        distanceIsApproximate = false;
        distanceCalcStatus = 'idle';
        setDistanceStatus('', '');
    }

    function haversineKm(origin, destination) {
        const R = 6371;
        const toRad = function (deg) { return deg * Math.PI / 180; };
        const dLat = toRad(destination.lat - origin.lat);
        const dLon = toRad(destination.lon - origin.lon);
        const lat1 = toRad(origin.lat);
        const lat2 = toRad(destination.lat);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    async function geocodeAddress(fields) {
        if (!window.DeliveryGeocode) {
            throw new Error('geocoder_missing');
        }
        await window.DeliveryGeocode.init();
        return window.DeliveryGeocode.geocodeAddress(fields);
    }

    async function fetchDrivingDistanceKm(origin, destination) {
        const coords = origin.lon + ',' + origin.lat + ';' + destination.lon + ',' + destination.lat;
        const url = 'https://router.project-osrm.org/route/v1/driving/' +
            coords + '?overview=false&alternatives=false';
        try {
            const res = await fetch(url, { headers: { Accept: 'application/json' } });
            if (!res.ok) throw new Error('route_failed');
            const data = await res.json();
            if (data.code === 'Ok' && data.routes && data.routes.length) {
                return { km: data.routes[0].distance / 1000, approximate: false };
            }
        } catch (err) {
            // fall through to straight-line estimate
        }
        const straight = haversineKm(origin, destination);
        return { km: straight * 1.3, approximate: true };
    }

    async function calculateDeliveryDistance() {
        const fields = getAddressFields();
        if (!hasCompleteAddress(fields)) {
            resetDistanceCalculation();
            if (getChoiceValue('#orderDelivery') === 'delivery') {
                setDistanceStatus('הזינ/י עיר, רחוב ומספר בית — המיקוד והמרחק יחושבו אוטומטית מ' + getDeliverySettings().origin.name, '');
            }
            updatePriceSummary();
            return;
        }

        const requestId = ++distanceCalcRequestId;
        distanceCalcStatus = 'loading';
        calculatedDistanceKm = null;
        distanceIsApproximate = false;
        const originName = getDeliverySettings().origin.name;
        setDistanceStatus('מחשב מרחק נסיעה מ' + originName + '…', 'loading');
        updatePriceSummary();

        try {
            const origin = getDeliverySettings().origin;
            const destination = await geocodeAddress(fields);
            const route = await fetchDrivingDistanceKm(origin, destination);
            if (requestId !== distanceCalcRequestId) return;

            calculatedDistanceKm = route.km;
            distanceIsApproximate = !!destination.approximate || !!route.approximate;
            distanceCalcStatus = 'ready';

            let statusMsg = (distanceIsApproximate
                ? 'מרחק משוער '
                : 'מרחק נסיעה ') + formatDistance(route.km) + ' ק"מ מ' + originName;

            if (destination.resolvedCity && destination.resolvedCity !== fields.city) {
                statusMsg += ' · זוהה יישוב: ' + destination.resolvedCity;
            } else if (distanceIsApproximate) {
                statusMsg += ' · לפי מיקוד/יישוב';
            }

            setDistanceStatus(statusMsg, 'ready');
        } catch (err) {
            if (requestId !== distanceCalcRequestId) return;
            calculatedDistanceKm = null;
            distanceCalcStatus = 'error';
            if (err && err.message === 'geocoder_missing') {
                setDistanceStatus('שגיאת טעינה — רעננ/י את הדף ונס/י שוב', 'error');
            } else if (err && err.message === 'address_not_found') {
                setDistanceStatus('לא נמצא יישוב למיקוד — ודא/י שם יישוב ומיקוד 7 ספרות מדואר ישראל', 'error');
            } else {
                setDistanceStatus('לא הצלחנו לחשב מרחק — נס/י שוב או פנו אלינו בוואטסאפ', 'error');
            }
        }

        updatePriceSummary();
    }

    function hasAddressForZip(fields) {
        return fields.city.length >= 2 &&
            fields.street.length >= 2 &&
            fields.houseNumber.length >= 1;
    }

    function setZipStatus(message, type) {
        const el = $('#orderZipStatus');
        if (!el) return;
        el.textContent = message || '';
        el.className = 'order-zip-status' + (type ? ' is-' + type : '');
    }

    function toggleZipLookupLink(show) {
        const link = $('#orderZipLookup');
        if (link) link.hidden = !show;
    }

    function canOverwriteZip(zipEl) {
        if (zipManual) return false;
        const current = normalizeZip(zipEl && zipEl.value);
        return !current || current === lastAutofillZip;
    }

    function applyAutofillZip(zip, source) {
        const zipEl = $('#orderDelZip');
        if (!zipEl || !zip) return;
        zipEl.value = zip;
        lastAutofillZip = zip;
        setZipStatus(
            source === 'street'
                ? 'מיקוד זוהה לפי הכתובת — אפשר לתקן'
                : 'מיקוד לפי היישוב — אפשר לתקן',
            'ready'
        );
        toggleZipLookupLink(false);
    }

    async function lookupAndFillZip() {
        const fields = getAddressFields();
        const zipEl = $('#orderDelZip');
        if (!hasAddressForZip(fields) || !zipEl) {
            if (!zipManual) setZipStatus('', '');
            toggleZipLookupLink(false);
            return;
        }
        if (!window.DeliveryGeocode) {
            setZipStatus('לא הצלחנו לזהות מיקוד — אפשר להזין ידנית', 'error');
            toggleZipLookupLink(true);
            return;
        }

        const requestId = ++zipLookupRequestId;
        await window.DeliveryGeocode.init();
        if (requestId !== zipLookupRequestId) return;

        if (canOverwriteZip(zipEl)) {
            const cityHit = window.DeliveryGeocode.lookupZipByCity(fields.city);
            if (cityHit && cityHit.zip) {
                applyAutofillZip(cityHit.zip, 'city');
            } else {
                setZipStatus('מזהה מיקוד לפי הכתובת…', 'loading');
            }
        }

        window.DeliveryGeocode.lookupZip(fields).then(function (result) {
            if (requestId !== zipLookupRequestId) return;
            if (result && result.zip && canOverwriteZip($('#orderDelZip'))) {
                const prev = normalizeZip(($('#orderDelZip') && $('#orderDelZip').value) || '');
                applyAutofillZip(result.zip, result.source);
                if (prev !== result.zip) calculateDeliveryDistance();
                return;
            }
            if (!validateZip(($('#orderDelZip') && $('#orderDelZip').value) || '')) {
                setZipStatus('לא מצאנו מיקוד — אפשר להזין ידנית', 'error');
                toggleZipLookupLink(true);
            }
        }).catch(function () {
            if (requestId !== zipLookupRequestId) return;
            if (!validateZip(($('#orderDelZip') && $('#orderDelZip').value) || '')) {
                setZipStatus('לא מצאנו מיקוד — אפשר להזין ידנית', 'error');
                toggleZipLookupLink(true);
            }
        });
    }

    function scheduleDistanceCalculation() {
        if (getChoiceValue('#orderDelivery') !== 'delivery') return;
        if (distanceCalcTimer) clearTimeout(distanceCalcTimer);
        distanceCalcStatus = 'idle';
        calculatedDistanceKm = null;
        setDistanceStatus('מעדכן חישוב מרחק…', 'loading');
        updatePriceSummary();
        distanceCalcTimer = setTimeout(function () {
            distanceCalcTimer = null;
            lookupAndFillZip().then(function () {
                calculateDeliveryDistance();
            });
        }, 700);
    }

    function getSellerWhatsAppUrl(message) {
        const phone = normalizePhone((appConfig && appConfig.contactPhone) || '533752633');
        return 'https://wa.me/972' + phone + '?text=' + encodeURIComponent(message);
    }

    function buildOrderNote(data) {
        const parts = [];
        if (data.note) parts.push(data.note);
        parts.push('תשלום: ' + data.payment);
        parts.push(data.deliveryType === 'delivery' ? 'משלוח עד הבית' : 'איסוף עצמי');
        if (data.deliveryType === 'delivery') {
            parts.push('כתובת: ' + data.addressFull);
            parts.push('מרחק: ' + formatDistance(data.distanceKm) + ' ק"מ');
            parts.push('משלוח: ' + formatMoney(data.deliveryCost));
        }
        parts.push('סה"כ: ' + formatMoney(data.totalPrice));
        return parts.join(' | ');
    }

    function buildOrderMessage(data, orderResult) {
        const product = (appConfig && appConfig.productName) || 'כורסת עיסוי VC900';
        let msg = '🛒 *הזמנה חדשה מהאתר*\n\n';
        msg += 'מוצר: ' + product + '\n';
        msg += 'מחיר כורסה: ' + formatMoney(data.productPrice) + '\n';
        if (data.deliveryType === 'delivery') {
            msg += 'משלוח (' + formatDistance(data.distanceKm) + ' ק"מ): ' + formatMoney(data.deliveryCost) + '\n';
        } else {
            msg += 'משלוח: איסוף עצמי (ללא עלות)\n';
        }
        msg += '*סה"כ: ' + formatMoney(data.totalPrice) + '*\n';
        msg += 'תשלום: ' + data.payment + '\n\n';
        msg += 'שם: ' + data.name + '\n';
        msg += 'טלפון: ' + formatPhoneDisplay(data.phone) + '\n';
        if (data.color) {
            msg += 'צבע: ' + data.color + '\n';
        }
        if (data.deliveryType === 'delivery') {
            msg += 'עיר: ' + data.city + '\n';
            msg += 'כתובת: ' + data.street + ' ' + data.houseNumber;
            if (data.apartment) msg += ', ' + data.apartment;
            msg += '\nמיקוד: ' + data.zip + '\n';
        }
        if (data.note) {
            msg += 'הערות: ' + data.note + '\n';
        }
        if (orderResult && orderResult.purchaseNumber) {
            msg += '\nמספר רכישה: #' + orderResult.purchaseNumber;
        }
        if (orderResult && orderResult.reviewUrl) {
            msg += '\n\n⭐ *קישור ביקורת ללקוח* (העבר לאחר אישור):\n' + orderResult.reviewUrl;
        }
        msg += '\n\n_נשלח מדף הנחיתה_';
        return msg;
    }

    function setStatus(msg, type) {
        const el = $('#orderFormStatus');
        if (!el) return;
        el.textContent = msg || '';
        el.className = 'order-form-status' + (type ? ' is-' + type : '');
    }

    function isSoldOut() {
        const remaining = StockApi.getRemaining();
        if (remaining != null) {
            return remaining <= 0;
        }
        const leftEl = document.querySelector('.stock-left-count');
        if (leftEl) {
            return Number(leftEl.textContent) <= 0;
        }
        return false;
    }

    function updateSoldOutUI() {
        const soldOut = isSoldOut();
        document.querySelectorAll('.join-group-btn').forEach(function (btn) {
            if (soldOut) {
                btn.classList.add('is-sold-out');
                const textEl = btn.querySelector('.btn-text');
                if (textEl) {
                    textEl.textContent = 'אזל המלאי';
                } else if (btn.childNodes.length) {
                    btn.textContent = 'אזל המלאי';
                }
                btn.setAttribute('aria-disabled', 'true');
            }
        });
        const note = $('#orderApiNote');
        if (note && soldOut) {
            note.textContent = 'לצערנו, המלאי במחיר המכולה אזל. ניתן ליצור קשר לבדיקת זמינות.';
            note.classList.add('is-warn');
        }
    }

    function openForm(e) {
        if (e) e.preventDefault();
        if (isSoldOut()) {
            setStatus('המלאי אזל במחיר המכולה.', 'error');
            return;
        }
        const overlay = $('#orderOverlay');
        if (!overlay) return;
        overlay.hidden = false;
        document.body.classList.add('order-open');
        setStatus('');
        updatePriceSummary();
        if (window.DeliveryGeocode) window.DeliveryGeocode.init();
        const nameInput = $('#orderName');
        if (nameInput && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
            nameInput.focus();
        }
    }

    function resetChoiceField(fieldId, inputId) {
        const field = $(fieldId);
        const input = $(inputId);
        if (input) input.value = '';
        if (field) {
            field.classList.remove('is-error');
            field.querySelectorAll('.order-choice-btn').forEach(function (btn) {
                btn.classList.remove('is-on');
                btn.setAttribute('aria-pressed', 'false');
            });
        }
    }

    function resetFormState() {
        resetColorSelection();
        resetChoiceField('#orderPaymentField', '#orderPayment');
        resetChoiceField('#orderDeliveryField', '#orderDelivery');
        const panel = $('#orderDeliveryPanel');
        if (panel) panel.hidden = true;
        ['#orderDelCity', '#orderDelStreet', '#orderDelHouse', '#orderDelApt', '#orderDelZip'].forEach(function (sel) {
            const el = $(sel);
            if (el) el.value = '';
        });
        resetDistanceCalculation();
        updatePriceSummary();
    }

    function closeForm() {
        const overlay = $('#orderOverlay');
        if (overlay) overlay.hidden = true;
        document.body.classList.remove('order-open');
        setStatus('');
        resetFormState();
    }

    function getSelectedColor() {
        const input = $('#orderColor');
        return input ? input.value.trim() : '';
    }

    function setSelectedColor(value) {
        const input = $('#orderColor');
        const field = $('#orderColorField');
        if (input) input.value = value || '';
        if (field) field.classList.remove('is-error');
        document.querySelectorAll('.order-color-swatch').forEach(function (btn) {
            const selected = btn.dataset.color === value;
            btn.classList.toggle('is-on', selected);
            btn.setAttribute('aria-pressed', selected ? 'true' : 'false');
        });
    }

    function resetColorSelection() {
        setSelectedColor('');
    }

    function setChoiceValue(fieldSelector, inputSelector, value) {
        const field = $(fieldSelector);
        const input = $(inputSelector);
        if (input) input.value = value || '';
        if (field) {
            field.classList.remove('is-error');
            field.querySelectorAll('.order-choice-btn').forEach(function (btn) {
                const selected = btn.dataset.value === value;
                btn.classList.toggle('is-on', selected);
                btn.setAttribute('aria-pressed', selected ? 'true' : 'false');
            });
        }
    }

    function getChoiceValue(inputSelector) {
        const input = $(inputSelector);
        return input ? input.value.trim() : '';
    }

    function toggleDeliveryPanel() {
        const deliveryType = getChoiceValue('#orderDelivery');
        const panel = $('#orderDeliveryPanel');
        if (!panel) return;
        panel.hidden = deliveryType !== 'delivery';
        if (deliveryType === 'delivery') {
            const settings = getDeliverySettings();
            setDistanceStatus('הזינ/י עיר, רחוב ומספר בית — המיקוד והמרחק יחושבו אוטומטית מ' + settings.origin.name, '');
            if (window.DeliveryGeocode) window.DeliveryGeocode.init();
        } else {
            resetDistanceCalculation();
        }
        updatePriceSummary();
    }

    function updatePriceSummary() {
        const settings = getDeliverySettings();
        const productPrice = getProductPrice();
        const deliveryType = getChoiceValue('#orderDelivery');
        const deliveryCost = deliveryType === 'delivery' && calculatedDistanceKm != null
            ? calcDeliveryCost(calculatedDistanceKm)
            : null;
        const total = productPrice + (deliveryCost || 0);

        const productEl = $('#orderProductPrice');
        const deliveryLine = $('#orderDeliveryLine');
        const deliveryLabelEl = $('#orderDeliveryLabelText');
        const deliveryPriceEl = $('#orderDeliveryPrice');
        const totalEl = $('#orderTotalPrice');

        if (productEl) productEl.textContent = formatMoney(productPrice);
        if (deliveryLine) deliveryLine.hidden = deliveryType !== 'delivery';
        if (deliveryLabelEl) {
            deliveryLabelEl.textContent = calculatedDistanceKm != null
                ? 'משלוח (' + formatDistance(calculatedDistanceKm) + ' ק"מ)'
                : 'משלוח';
        }
        if (deliveryPriceEl) {
            if (deliveryType !== 'delivery') {
                deliveryPriceEl.textContent = '—';
            } else if (distanceCalcStatus === 'loading') {
                deliveryPriceEl.textContent = '…';
            } else if (deliveryCost != null) {
                deliveryPriceEl.textContent = formatMoney(deliveryCost);
            } else {
                deliveryPriceEl.textContent = '—';
            }
        }
        if (totalEl) {
            totalEl.textContent = formatMoney(
                deliveryType === 'delivery' && deliveryCost == null ? productPrice : total
            );
        }

        const hint = $('#orderDeliveryHint');
        if (hint) {
            hint.textContent = 'משלוח כורסה מ' + settings.origin.name + ': ' +
                formatMoney(settings.basePrice) + ' עד ' + settings.includedKm +
                ' ק"מ · מעל כך ' + formatMoney(settings.extraPer10Km) + ' לכל 10 ק"מ';
        }
    }

    function bindColorSwatches() {
        const field = $('#orderColorField');
        if (!field) return;
        field.addEventListener('click', function (e) {
            const btn = e.target.closest('.order-color-swatch');
            if (!btn || !field.contains(btn)) return;
            setSelectedColor(btn.dataset.color || '');
            setStatus('');
        });
    }

    function bindChoiceGroup(fieldSelector, inputSelector, onChange) {
        const field = $(fieldSelector);
        if (!field) return;
        field.addEventListener('click', function (e) {
            const btn = e.target.closest('.order-choice-btn');
            if (!btn || !field.contains(btn)) return;
            setChoiceValue(fieldSelector, inputSelector, btn.dataset.value || '');
            setStatus('');
            if (onChange) onChange();
        });
    }

    function bindDeliveryInputs() {
        const panel = $('#orderDeliveryPanel');
        if (!panel) return;
        panel.addEventListener('input', function (e) {
            const id = e.target && e.target.id;
            if (id === 'orderDelZip') {
                zipManual = true;
                setZipStatus('מיקוד שהוזן ידנית — אפשר לתקן', '');
                toggleZipLookupLink(false);
            } else if (id === 'orderDelCity' || id === 'orderDelStreet' || id === 'orderDelHouse') {
                zipManual = false;
            }
            scheduleDistanceCalculation();
        });
        panel.addEventListener('change', scheduleDistanceCalculation);
        const zipEl = $('#orderDelZip');
        if (zipEl) {
            zipEl.addEventListener('blur', function () {
                const normalized = formatZipDisplay(zipEl.value);
                if (normalized) zipEl.value = normalized;
                scheduleDistanceCalculation();
            });
        }
    }

    function collectFormData() {
        const deliveryType = getChoiceValue('#orderDelivery');
        const fields = getAddressFields();
        const productPrice = getProductPrice();
        const deliveryCost = deliveryType === 'delivery' && calculatedDistanceKm != null
            ? (calcDeliveryCost(calculatedDistanceKm) || 0)
            : 0;

        return {
            name: ($('#orderName') && $('#orderName').value.trim()) || '',
            phone: ($('#orderPhone') && $('#orderPhone').value.trim()) || '',
            color: getSelectedColor(),
            payment: getChoiceValue('#orderPayment'),
            deliveryType: deliveryType,
            city: deliveryType === 'delivery' ? fields.city : '',
            street: deliveryType === 'delivery' ? fields.street : '',
            houseNumber: deliveryType === 'delivery' ? fields.houseNumber : '',
            apartment: deliveryType === 'delivery' ? fields.apartment : '',
            zip: deliveryType === 'delivery' ? fields.zip : '',
            distanceKm: deliveryType === 'delivery' ? calculatedDistanceKm : null,
            deliveryCost: deliveryCost,
            productPrice: productPrice,
            totalPrice: productPrice + deliveryCost,
            addressFull: deliveryType === 'delivery' ? buildAddressFull(fields) : '',
            note: ($('#orderNote') && $('#orderNote').value.trim()) || ''
        };
    }

    function validateFormData(data) {
        if (data.name.length < 2) {
            setStatus('נא להזין שם מלא', 'error');
            return false;
        }
        if (!validatePhone(data.phone)) {
            setStatus('נא להזין מספר נייד ישראלי תקין (05X)', 'error');
            return false;
        }
        if (!data.color) {
            setStatus('נא לבחור צבע כורסה', 'error');
            const colorField = $('#orderColorField');
            if (colorField) {
                colorField.classList.add('is-error');
                const firstSwatch = colorField.querySelector('.order-color-swatch');
                if (firstSwatch) firstSwatch.focus();
            }
            return false;
        }
        if (!data.payment) {
            setStatus('נא לבחור אופן תשלום', 'error');
            const field = $('#orderPaymentField');
            if (field) field.classList.add('is-error');
            return false;
        }
        if (!data.deliveryType) {
            setStatus('נא לבחור איסוף עצמי או משלוח', 'error');
            const field = $('#orderDeliveryField');
            if (field) field.classList.add('is-error');
            return false;
        }
        if (data.deliveryType === 'delivery') {
            const fields = getAddressFields();
            if (!fields.city || fields.city.length < 2) {
                setStatus('נא להזין עיר למשלוח', 'error');
                $('#orderDelCity') && $('#orderDelCity').focus();
                return false;
            }
            if (!fields.street || fields.street.length < 2) {
                setStatus('נא להזין רחוב', 'error');
                $('#orderDelStreet') && $('#orderDelStreet').focus();
                return false;
            }
            if (!fields.houseNumber) {
                setStatus('נא להזין מספר בית', 'error');
                $('#orderDelHouse') && $('#orderDelHouse').focus();
                return false;
            }
            if (!validateZip(fields.zip)) {
                setStatus('לא זוהה מיקוד — בדקו את הכתובת או הזינו 7 ספרות', 'error');
                $('#orderDelZip') && $('#orderDelZip').focus();
                return false;
            }
            if (distanceCalcStatus === 'loading') {
                setStatus('מחשבים מרחק משלוח — נא להמתין רגע', 'info');
                return false;
            }
            if (distanceCalcStatus === 'error' || calculatedDistanceKm == null) {
                setStatus('לא ניתן לחשב משלוח — בדוק/י את הכתובת', 'error');
                return false;
            }
        }
        return true;
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (isSubmitting || isSoldOut()) return;

        if (getChoiceValue('#orderDelivery') === 'delivery' && hasCompleteAddress(getAddressFields())) {
            if (distanceCalcStatus === 'loading') {
                setStatus('מחשבים מרחק משלוח — נא להמתין רגע', 'info');
                return;
            }
            if (calculatedDistanceKm == null || distanceCalcStatus === 'error') {
                await calculateDeliveryDistance();
            }
        }

        const data = collectFormData();
        if (!validateFormData(data)) return;

        isSubmitting = true;
        const btn = $('#orderSubmitBtn');
        if (btn) {
            btn.disabled = true;
            const textEl = btn.querySelector('.order-btn-text');
            if (textEl) textEl.textContent = 'שולח…';
        }

        const orderData = {
            name: data.name,
            phone: data.phone,
            city: data.city,
            color: data.color,
            note: buildOrderNote(data),
            payment: data.payment,
            deliveryType: data.deliveryType,
            deliveryCost: data.deliveryCost,
            totalPrice: data.totalPrice,
            address: data.addressFull,
            distanceKm: data.distanceKm
        };

        let orderResult = null;

        try {
            if (StockApi.isEnabled()) {
                setStatus('שומרים את ההזמנה ומעדכנים מלאי…', 'info');
                orderResult = await StockApi.submitOrder(orderData);
                if (orderResult.error === 'sold_out' || orderResult.ok === false) {
                    setStatus('מצטערים — המלאי נגמר הרגע.', 'error');
                    updateSoldOutUI();
                    return;
                }
            } else {
                setStatus('פותחים וואטסאפ…', 'info');
            }

            window.open(getSellerWhatsAppUrl(buildOrderMessage(data, orderResult)), '_blank', 'noopener');

            setStatus(
                StockApi.isEnabled()
                    ? (orderResult && orderResult.reviewUrl
                        ? 'ההזמנה נשמרה. בוואטסאפ יש קישור ביקורת אישי ללקוח.'
                        : 'ההזמנה נשמרה והמלאי עודכן. שלחנו אותך לוואטסאפ.')
                    : 'נפתח וואטסאפ — שלח את ההודעה כדי להשלים את ההזמנה.',
                'ok'
            );

            setTimeout(closeForm, 1800);
        } catch (err) {
            setStatus(err.message || 'שגיאה בשליחה. נסה שוב או צור קשר בוואטסאפ.', 'error');
        } finally {
            isSubmitting = false;
            if (btn) {
                btn.disabled = false;
                const textEl = btn.querySelector('.order-btn-text');
                if (textEl) textEl.textContent = 'שלח הזמנה בוואטסאפ';
            }
        }
    }

    function buildUI() {
        if ($('#orderOverlay')) return;

        const settings = getDeliverySettings();
        const overlay = document.createElement('div');
        overlay.id = 'orderOverlay';
        overlay.hidden = true;
        overlay.innerHTML = `
<div class="order-sheet" role="dialog" aria-labelledby="orderTitle" aria-modal="true">
  <header class="order-sheet-header">
    <button type="button" class="order-back" id="orderCloseBtn" aria-label="חזרה"><i class="fas fa-arrow-right"></i></button>
    <h2 id="orderTitle">הזמנה במחיר מפעל</h2>
    <span class="order-sheet-header-spacer" aria-hidden="true"></span>
  </header>
  <div class="order-sheet-body">
    <div class="order-form-card">
      <p class="order-lead">מלא/י פרטים — נפתח וואטסאפ עם ההזמנה שלך</p>
      <p class="order-api-note" id="orderApiNote"></p>
      <form id="orderForm" novalidate>
        <label for="orderName">שם מלא *</label>
        <input type="text" id="orderName" class="order-input" required autocomplete="name" placeholder="ישראל ישראלי">
        <label for="orderPhone">נייד *</label>
        <input type="tel" id="orderPhone" class="order-input" required autocomplete="tel" inputmode="tel" placeholder="050-0000000">
        <label id="orderColorLabel">צבע כורסה *</label>
        <div class="order-color-field" id="orderColorField">
          <input type="hidden" id="orderColor" value="">
          <div class="order-color-swatches" role="radiogroup" aria-labelledby="orderColorLabel">
            ${COLOR_OPTIONS.map(function (c) {
                return `
            <button type="button" class="order-color-swatch" data-color="${c.value}" aria-label="${c.value}" aria-pressed="false">
              <span class="order-color-swatch-dot" style="--swatch:${c.hex}"></span>
              <span class="order-color-swatch-label">${c.value}</span>
            </button>`;
            }).join('')}
          </div>
        </div>
        <label id="orderPaymentLabel">אופן תשלום *</label>
        <div class="order-choice-field" id="orderPaymentField">
          <input type="hidden" id="orderPayment" value="">
          <div class="order-choice-grid" role="radiogroup" aria-labelledby="orderPaymentLabel">
            ${PAYMENT_OPTIONS.map(function (p) {
                return `<button type="button" class="order-choice-btn" data-value="${p.value}" aria-pressed="false">${p.label}</button>`;
            }).join('')}
          </div>
        </div>
        <label id="orderDeliveryLabel">קבלת ההזמנה *</label>
        <div class="order-choice-field" id="orderDeliveryField">
          <input type="hidden" id="orderDelivery" value="">
          <div class="order-choice-row" role="radiogroup" aria-labelledby="orderDeliveryLabel">
            <button type="button" class="order-choice-btn order-choice-btn-wide" data-value="pickup" aria-pressed="false">
              <span class="order-choice-title">איסוף עצמי</span>
              <span class="order-choice-sub">ללא עלות</span>
            </button>
            <button type="button" class="order-choice-btn order-choice-btn-wide" data-value="delivery" aria-pressed="false">
              <span class="order-choice-title">משלוח עד הבית</span>
              <span class="order-choice-sub">מ-${formatMoney(settings.basePrice)}</span>
            </button>
          </div>
        </div>
        <div class="order-delivery-panel" id="orderDeliveryPanel" hidden>
          <p class="order-panel-hint" id="orderDeliveryHint"></p>
          <label for="orderDelCity">יישוב / עיר * <span class="order-label-note">כמו בדואר ישראל</span></label>
          <input type="text" id="orderDelCity" class="order-input" autocomplete="address-level2" placeholder="נעלה">
          <div class="order-field-row">
            <div class="order-field-col">
              <label for="orderDelStreet">רחוב *</label>
              <input type="text" id="orderDelStreet" class="order-input" autocomplete="street-address" placeholder="הרצל">
            </div>
            <div class="order-field-col order-field-col-narrow">
              <label for="orderDelHouse">מס' *</label>
              <input type="text" id="orderDelHouse" class="order-input" inputmode="numeric" placeholder="12">
            </div>
          </div>
          <div class="order-field-row">
            <div class="order-field-col">
              <label for="orderDelApt">דירה / קומה</label>
              <input type="text" id="orderDelApt" class="order-input" placeholder="דירה 3">
            </div>
            <div class="order-field-col">
              <label for="orderDelZip">מיקוד * <span class="order-label-note">אוטומטי</span></label>
              <input type="text" id="orderDelZip" class="order-input" inputmode="numeric" autocomplete="postal-code" placeholder="יתמלא לפי הכתובת" maxlength="7" pattern="[0-9]{7}">
            </div>
          </div>
          <p class="order-zip-status" id="orderZipStatus" aria-live="polite"></p>
          <a class="order-zip-lookup" id="orderZipLookup" href="https://doar.israelpost.co.il/locatezip" target="_blank" rel="noopener noreferrer" hidden>
            <i class="fas fa-map-marker-alt" aria-hidden="true"></i>
            איתור מיקוד בדואר ישראל
          </a>
          <p class="order-distance-status" id="orderDistanceStatus" aria-live="polite"></p>
        </div>
        <label for="orderNote">הערות</label>
        <textarea id="orderNote" class="order-input order-textarea" rows="2" placeholder="שאלה, זמן מועדף…"></textarea>
        <div class="order-price-row" aria-label="סיכום מחיר">
          <span class="order-price-label">סיכום הזמנה</span>
          <div class="order-price-breakdown">
            <div class="order-price-line">
              <span>כורסה (מחיר מכולה)</span>
              <span id="orderProductPrice" class="order-product-price">₪8,900</span>
            </div>
            <div class="order-price-line" id="orderDeliveryLine" hidden>
              <span id="orderDeliveryLabelText">משלוח</span>
              <span id="orderDeliveryPrice">—</span>
            </div>
            <div class="order-price-line order-price-line-total">
              <span>סה״כ לתשלום</span>
              <span id="orderTotalPrice" class="order-price-now">₪8,900</span>
            </div>
          </div>
          <span class="order-price-was original-price">מחיר שוק: ₪12,000</span>
        </div>
        <button type="submit" class="order-btn order-btn-primary" id="orderSubmitBtn">
          <span class="order-btn-text">שלח הזמנה בוואטסאפ</span>
          <i class="fab fa-whatsapp" aria-hidden="true"></i>
        </button>
        <p class="order-form-status" id="orderFormStatus" aria-live="polite"></p>
        <p class="order-fine">בלחיצה תועבר/י לוואטסאפ עם פרטי ההזמנה. אין חיוב אוטומטי.</p>
        <div class="order-trust-row">
          <span><i class="fas fa-lock"></i> מאובטח</span>
          <span><i class="fas fa-shield-alt"></i> אחריות יצרן</span>
        </div>
      </form>
    </div>
  </div>
</div>`;
        document.body.appendChild(overlay);

        overlay.addEventListener('click', function (ev) {
            if (ev.target === overlay) closeForm();
        });
        $('#orderCloseBtn').addEventListener('click', closeForm);
        $('#orderForm').addEventListener('submit', handleSubmit);
        bindColorSwatches();
        bindChoiceGroup('#orderPaymentField', '#orderPayment');
        bindChoiceGroup('#orderDeliveryField', '#orderDelivery', toggleDeliveryPanel);
        bindDeliveryInputs();
        updatePriceSummary();
    }

    function bindTriggers() {
        document.addEventListener('click', function (e) {
            const btn = e.target.closest('.join-group-btn');
            if (!btn || btn.classList.contains('is-sold-out')) return;
            openForm(e);
        });
    }

    function updateApiNote() {
        const note = $('#orderApiNote');
        if (!note) return;
        if (StockApi.isEnabled()) {
            note.hidden = false;
            note.textContent = 'המלאי באתר יתעדכן אוטומטית עם שליחת ההזמנה.';
            note.classList.remove('is-muted');
        } else {
            note.hidden = true;
            note.textContent = '';
        }
    }

    function init(config) {
        appConfig = config;
        buildUI();
        bindTriggers();
        updateApiNote();
        updateSoldOutUI();
        updatePriceSummary();
    }

    document.addEventListener('vipo:config-loaded', function (e) {
        init(e.detail || {});
    });

    document.addEventListener('vipo:stock-updated', function () {
        updateSoldOutUI();
    });
})();
