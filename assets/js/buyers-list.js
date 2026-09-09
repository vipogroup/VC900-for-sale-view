(function () {
    const COLOR_CLASS = {
        'שמנת': 'is-cream',
        'אפור': 'is-gray',
        'נייבי': 'is-navy',
        'שחור': 'is-black',
        'חום': 'is-brown',
        'לבן': 'is-white',
        "בז'": 'is-beige',
        'בז': 'is-beige',
        'בז׳': 'is-beige',
        'כחול': 'is-blue'
    };

    var allBuyers = [];
    var listSettings = { initialVisible: 5, maxVisible: 25 };
    var expanded = false;

    function formatDate(iso) {
        if (!iso) return '';
        var parts = String(iso).slice(0, 10).split('-');
        if (parts.length !== 3) return iso;
        return parts[2] + '/' + parts[1] + '/' + parts[0];
    }

    function rowHtml(b) {
        var colorClass = COLOR_CLASS[b.color] || 'is-neutral';
        return (
            '<li class="lp-buyer-row">' +
            '<span class="lp-buyer-num">#' + b.number + '</span>' +
            '<span class="lp-buyer-name">' + b.name + '</span>' +
            '<span class="lp-buyer-color ' + colorClass + '">' + (b.color || '—') + '</span>' +
            '<span class="lp-buyer-date">' + formatDate(b.date) + '</span>' +
            '</li>'
        );
    }

    function visibleCount() {
        var cap = listSettings.maxVisible || allBuyers.length;
        var sorted = allBuyers.slice(0, cap);
        if (expanded) return sorted.length;
        return Math.min(listSettings.initialVisible || 5, sorted.length);
    }

    function updateToggle() {
        var toggle = document.getElementById('lpBuyersToggle');
        var list = document.getElementById('lpBuyersList');
        if (!toggle || !list) return;

        var cap = Math.min(listSettings.maxVisible || allBuyers.length, allBuyers.length);
        var shown = visibleCount();
        var hidden = cap - shown;

        if (hidden <= 0 || expanded) {
            toggle.hidden = true;
            list.classList.remove('is-collapsed');
            return;
        }

        toggle.hidden = false;
        toggle.textContent = 'הצג עוד ' + hidden + ' רוכשים';
        toggle.setAttribute('aria-expanded', 'false');
        list.classList.add('is-collapsed');
    }

    function renderBuyers(buyers) {
        var list = document.getElementById('lpBuyersList');
        var section = document.getElementById('lpBuyersSection');
        if (!list || !section) return;

        allBuyers = (buyers || [])
            .slice()
            .sort(function (a, b) { return Number(b.number) - Number(a.number); });

        if (!allBuyers.length) {
            section.hidden = true;
            return;
        }

        section.hidden = false;
        var cap = listSettings.maxVisible || allBuyers.length;
        var pool = allBuyers.slice(0, cap);
        var count = visibleCount();
        list.innerHTML = pool.slice(0, count).map(rowHtml).join('');
        updateToggle();
    }

    function bindToggle() {
        var toggle = document.getElementById('lpBuyersToggle');
        if (!toggle || toggle.dataset.bound) return;
        toggle.dataset.bound = '1';
        toggle.addEventListener('click', function () {
            expanded = true;
            renderBuyers(allBuyers);
            toggle.setAttribute('aria-expanded', 'true');
            toggle.hidden = true;
            var list = document.getElementById('lpBuyersList');
            if (list) list.classList.remove('is-collapsed');
        });
    }

    async function loadBuyers(config) {
        var bl = (config && config.buyersList) || {};
        listSettings.initialVisible = bl.initialVisible != null ? bl.initialVisible : 5;
        listSettings.maxVisible = bl.maxVisible != null ? bl.maxVisible : 25;
        expanded = false;

        if (bl.enabled === false) {
            var section = document.getElementById('lpBuyersSection');
            if (section) section.hidden = true;
            return;
        }

        bindToggle();

        var buyers = [];
        if (typeof StockApi !== 'undefined' && StockApi.fetchBuyers) {
            buyers = await StockApi.fetchBuyers();
        }
        if (!buyers.length) {
            try {
                var res = await fetch('buyers.json?_=' + Date.now(), { cache: 'no-store' });
                if (res.ok) {
                    var data = await res.json();
                    buyers = data.buyers || [];
                }
            } catch (err) {
                console.warn('BuyersList: buyers.json not loaded', err);
            }
        }
        renderBuyers(buyers);
    }

    document.addEventListener('vipo:config-loaded', function (e) {
        loadBuyers(e.detail || {});
    });

    document.addEventListener('vipo:stock-updated', function () {
        fetch('config.json?_=' + Date.now())
            .then(function (r) { return r.json(); })
            .then(loadBuyers)
            .catch(function () { loadBuyers({}); });
    });
})();
