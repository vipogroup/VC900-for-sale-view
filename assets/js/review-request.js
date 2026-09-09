(function () {
    var selectedStars = 5;

    function $(id) {
        return document.getElementById(id);
    }

    function setStatus(msg, type) {
        var el = $('reqStatus');
        if (!el) return;
        el.textContent = msg || '';
        el.className = 'review-status' + (type ? ' is-' + type : '');
    }

    function normalizePhone(raw) {
        var d = String(raw || '').replace(/\D/g, '');
        if (d.indexOf('972') === 0) d = d.slice(3);
        if (d.indexOf('0') === 0) d = d.slice(1);
        return d;
    }

    function initStars() {
        var wrap = $('reqStarsInput');
        if (!wrap) return;
        wrap.querySelectorAll('.review-star-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                selectedStars = Number(btn.dataset.star) || 5;
                $('reqStars').value = String(selectedStars);
                wrap.querySelectorAll('.review-star-btn').forEach(function (b) {
                    b.classList.toggle('is-on', Number(b.dataset.star) <= selectedStars);
                });
            });
        });
    }

    async function handleSubmit(e) {
        e.preventDefault();
        var name = ($('reqName') && $('reqName').value.trim()) || '';
        var phone = ($('reqPhone') && $('reqPhone').value.trim()) || '';
        var color = ($('reqColor') && $('reqColor').value.trim()) || '';
        var text = ($('reqText') && $('reqText').value.trim()) || '';

        if (name.length < 2) {
            setStatus('נא להזין שם', 'error');
            return;
        }
        if (!/^5\d{8}$/.test(normalizePhone(phone))) {
            setStatus('נא להזין מספר נייד ישראלי תקין', 'error');
            return;
        }
        if (text.length < 10) {
            setStatus('נא לכתוב לפחות 10 תווים', 'error');
            return;
        }

        var btn = $('reqSubmitBtn');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'שולח…';
        }
        setStatus('');

        try {
            var result = await StockApi.submitReviewRequest({
                name: name,
                phone: phone,
                color: color,
                stars: selectedStars,
                text: text
            });
            if (!result.ok) {
                setStatus('שגיאה בשליחה. נסה שוב.', 'error');
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = 'שליחה לאישור';
                }
                return;
            }
            $('reviewRequestFormWrap').hidden = true;
            $('reviewRequestDone').hidden = false;
        } catch (err) {
            setStatus('לא ניתן לשלוח כרגע. נסה מאוחר יותר או צור קשר בוואטסאפ.', 'error');
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'שליחה לאישור';
            }
        }
    }

    document.addEventListener('DOMContentLoaded', function () {
        initStars();
        fetch('config.json')
            .then(function (r) { return r.json(); })
            .then(function (cfg) { return StockApi.initForReview(cfg); })
            .catch(function () {});

        var form = $('reviewRequestForm');
        if (form) form.addEventListener('submit', handleSubmit);
    });
})();
