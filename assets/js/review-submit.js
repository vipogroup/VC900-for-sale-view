(function () {
    var token = '';
    var selectedStars = 5;

    function $(id) {
        return document.getElementById(id);
    }

    function show(id) {
        ['reviewLoading', 'reviewInvalid', 'reviewDone', 'reviewFormWrap'].forEach(function (el) {
            var node = $(el);
            if (node) node.hidden = el !== id;
        });
    }

    function setStatus(msg, type) {
        var el = $('reviewStatus');
        if (!el) return;
        el.textContent = msg || '';
        el.className = 'review-status' + (type ? ' is-' + type : '');
    }

    function getTokenFromUrl() {
        var params = new URLSearchParams(window.location.search);
        return (params.get('token') || '').trim();
    }

    function initStars() {
        var wrap = $('reviewStarsInput');
        if (!wrap) return;
        wrap.querySelectorAll('.review-star-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                selectedStars = Number(btn.dataset.star) || 5;
                $('reviewStars').value = String(selectedStars);
                wrap.querySelectorAll('.review-star-btn').forEach(function (b) {
                    var n = Number(b.dataset.star);
                    b.classList.toggle('is-on', n <= selectedStars);
                });
            });
        });
    }

    async function init() {
        token = getTokenFromUrl();
        initStars();

        if (!token) {
            show('reviewInvalid');
            return;
        }

        try {
            var result = await StockApi.validateReviewToken(token);
            if (!result.ok) {
                show('reviewInvalid');
                return;
            }
            $('reviewPurchaseNum').textContent = '#' + result.purchaseNumber;
            var nameEl = $('reviewBuyerName');
            if (nameEl) {
                nameEl.textContent = result.displayName + (result.color ? ' · ' + result.color : '');
            }
            show('reviewFormWrap');
        } catch (err) {
            show('reviewInvalid');
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        var text = ($('reviewText') && $('reviewText').value.trim()) || '';
        if (text.length < 10) {
            setStatus('נא לכתוב לפחות 10 תווים', 'error');
            return;
        }

        var btn = $('reviewSubmitBtn');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'שולח…';
        }
        setStatus('');

        try {
            var result = await StockApi.submitReview({
                token: token,
                stars: selectedStars,
                text: text
            });
            if (!result.ok) {
                setStatus('לא ניתן לשלוח — ייתכן שהקישור כבר נוצל', 'error');
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = 'שליחה לאישור';
                }
                return;
            }
            show('reviewDone');
        } catch (err) {
            setStatus('שגיאה בשליחה. נסה שוב.', 'error');
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'שליחה לאישור';
            }
        }
    }

    document.addEventListener('DOMContentLoaded', function () {
        fetch('config.json')
            .then(function (r) { return r.json(); })
            .then(function (cfg) {
                return StockApi.initForReview ? StockApi.initForReview(cfg) : Promise.resolve();
            })
            .catch(function () {})
            .finally(init);

        var form = $('reviewForm');
        if (form) form.addEventListener('submit', handleSubmit);
    });
})();
