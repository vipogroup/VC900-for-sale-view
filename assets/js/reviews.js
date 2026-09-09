(function () {
    var INITIAL_VISIBLE = 2;
    var allReviews = [];
    var expanded = false;

    function escapeHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function renderStars(n) {
        var count = Math.max(0, Math.min(5, Number(n) || 5));
        var out = '';
        for (var i = 0; i < 5; i++) {
            out += '<i class="fas fa-star' + (i < count ? '' : ' lp-review-star-off') + '" aria-hidden="true"></i>';
        }
        return out;
    }

    function cardHtml(r) {
        var initial = escapeHtml((r.name || '?').charAt(0));
        return (
            '<div class="s4-card lp-review-card">' +
            '<div class="s4-card-top">' +
            '<div class="s4-avatar">' + initial + '</div>' +
            '<div class="s4-meta">' +
            '<strong>' + escapeHtml(r.name) + '</strong>' +
            '<div class="s4-mini-stars lp-review-stars">' + renderStars(r.stars) + '</div>' +
            '</div>' +
            '<span class="s4-badge" title="רכישה מאומתת"><i class="fas fa-circle-check"></i><span class="s4-badge-txt"> מאומת</span></span>' +
            '</div>' +
            '<p class="s4-body lp-review-text">"' + escapeHtml(r.text) + '"</p>' +
            '</div>'
        );
    }

    function updateToggle() {
        var toggle = document.getElementById('lpReviewsToggle');
        if (!toggle) return;

        var hidden = allReviews.length - INITIAL_VISIBLE;
        if (expanded || hidden <= 0) {
            toggle.hidden = true;
            return;
        }

        toggle.hidden = false;
        toggle.textContent = 'הצג עוד ' + hidden + ' ביקורות';
        toggle.setAttribute('aria-expanded', 'false');
    }

    function bindToggle() {
        var toggle = document.getElementById('lpReviewsToggle');
        if (!toggle || toggle.dataset.bound) return;
        toggle.dataset.bound = '1';
        toggle.addEventListener('click', function () {
            expanded = true;
            renderReviews(allReviews, true);
            toggle.setAttribute('aria-expanded', 'true');
            toggle.hidden = true;
        });
    }

    function renderReviews(items, keepExpanded) {
        var section = document.getElementById('lpReviewsSection');
        var list = document.getElementById('lpReviewsList');
        if (!section || !list) return;

        allReviews = items || [];
        if (!keepExpanded) expanded = false;

        if (!allReviews.length) {
            section.hidden = true;
            updateToggle();
            return;
        }

        section.hidden = false;
        bindToggle();

        var useHeroCards = list.classList.contains('s4-list');
        var visible = expanded ? allReviews : allReviews.slice(0, INITIAL_VISIBLE);

        if (useHeroCards) {
            list.innerHTML = visible.map(cardHtml).join('');
        } else {
            list.innerHTML = visible.map(function (r) {
                return (
                    '<article class="lp-review-card">' +
                    '<div class="lp-review-stars" aria-label="' + (r.stars || 5) + ' כוכבים">' + renderStars(r.stars) + '</div>' +
                    '<p class="lp-review-text">"' + escapeHtml(r.text) + '"</p>' +
                    '<footer class="lp-review-author">' + escapeHtml(r.name) + '</footer>' +
                    '</article>'
                );
            }).join('');
        }

        updateToggle();
    }

    async function loadReviews(config) {
        if (config && config.reviews && config.reviews.enabled === false) {
            renderReviews([]);
            return;
        }

        if (typeof StockApi !== 'undefined' && StockApi.fetchReviews) {
            var apiReviews = await StockApi.fetchReviews();
            if (apiReviews.length) {
                renderReviews(apiReviews);
                return;
            }
        }

        var items = (config && config.reviews && config.reviews.items) || [];
        if (items.length) {
            renderReviews(items);
            return;
        }

        try {
            var res = await fetch('reviews.json?_=' + Date.now(), { cache: 'no-store' });
            if (res.ok) {
                var data = await res.json();
                renderReviews(data.reviews || []);
                return;
            }
        } catch (err) {
            console.warn('Reviews: reviews.json not loaded', err);
        }
        renderReviews([]);
    }

    document.addEventListener('vipo:config-loaded', function (e) {
        loadReviews(e.detail || {});
    });
})();
