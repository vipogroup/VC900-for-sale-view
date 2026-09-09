/**
 * מלאי חי — קריאה/שמירה דרך JSONBin (או fallback ל-config.json)
 * הגדרה: config.json → stockLive
 */
const StockLive = (function () {
    const MASTER_KEY_STORAGE = 'vipo-stock-master-key';
    let appConfig = null;
    let onStockChange = null;
    let pollTimer = null;
    let lastStock = null;

    function isEnabled() {
        const live = appConfig && appConfig.stockLive;
        return !!(live && live.enabled && live.binId);
    }

    function getMasterKey() {
        try {
            return sessionStorage.getItem(MASTER_KEY_STORAGE) || '';
        } catch (e) {
            return '';
        }
    }

    function setMasterKey(key) {
        try {
            if (key) {
                sessionStorage.setItem(MASTER_KEY_STORAGE, key);
            } else {
                sessionStorage.removeItem(MASTER_KEY_STORAGE);
            }
        } catch (e) {
            /* ignore */
        }
    }

    function applyStock(totalUnits, soldUnits) {
        lastStock = { totalUnits, soldUnits };
        if (typeof onStockChange === 'function') {
            onStockChange(totalUnits, soldUnits);
        }
    }

    function fallbackStock() {
        if (appConfig && appConfig.totalUnits != null && appConfig.soldUnits != null) {
            applyStock(Number(appConfig.totalUnits), Number(appConfig.soldUnits));
        }
    }

    async function fetchStock() {
        const live = appConfig && appConfig.stockLive;
        if (!isEnabled()) {
            fallbackStock();
            return lastStock;
        }

        const headers = { 'X-Bin-Meta': 'false' };
        if (live.readKey) {
            headers['X-Master-Key'] = live.readKey;
        }

        try {
            const res = await fetch(
                `https://api.jsonbin.io/v3/b/${live.binId}/latest`,
                { headers, cache: 'no-store' }
            );
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }
            const data = await res.json();
            const record = data.record || {};
            const totalUnits = Number(record.totalUnits);
            const soldUnits = Number(record.soldUnits);
            if (!Number.isFinite(totalUnits) || !Number.isFinite(soldUnits)) {
                throw new Error('invalid stock record');
            }
            applyStock(totalUnits, soldUnits);
            return lastStock;
        } catch (err) {
            console.warn('StockLive: fetch failed, using config.json', err);
            fallbackStock();
            return lastStock;
        }
    }

    async function saveStock(totalUnits, soldUnits, masterKey) {
        const live = appConfig && appConfig.stockLive;
        if (!isEnabled()) {
            throw new Error('stockLive לא מוגדר — ראה הוראות בפאנל המנהל');
        }

        const key = masterKey || getMasterKey();
        if (!key) {
            throw new Error('נדרש Master Key מ-JSONBin');
        }

        const body = {
            totalUnits: Number(totalUnits),
            soldUnits: Number(soldUnits),
            updatedAt: new Date().toISOString()
        };

        const res = await fetch(`https://api.jsonbin.io/v3/b/${live.binId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': key
            },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const errText = await res.text().catch(() => '');
            throw new Error(errText || `שמירה נכשלה (${res.status})`);
        }

        setMasterKey(key);
        applyStock(body.totalUnits, body.soldUnits);
        return lastStock;
    }

    function startPolling(intervalMs) {
        if (pollTimer) {
            clearInterval(pollTimer);
        }
        if (!isEnabled()) {
            return;
        }
        pollTimer = setInterval(fetchStock, intervalMs || 20000);
    }

    function init(config, updateCallback) {
        appConfig = config;
        onStockChange = updateCallback;
        fetchStock().finally(() => startPolling(20000));
    }

    return {
        init,
        fetchStock,
        saveStock,
        isEnabled,
        getMasterKey,
        setMasterKey,
        getLastStock: () => lastStock
    };
})();
