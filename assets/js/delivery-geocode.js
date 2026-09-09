/**
 * Geocoding for Israeli delivery addresses — Nominatim + settlement fallback.
 */
(function (global) {
    let settlements = null;
    let zipIndex = null;
    let cityZipIndex = null;
    let loadPromise = null;

    function normalizeName(value) {
        return String(value || '')
            .trim()
            .replace(/[׳'"]/g, '')
            .replace(/\s+/g, ' ')
            .replace(/-/g, ' ')
            .toLowerCase();
    }

    function levenshtein(a, b) {
        if (a === b) return 0;
        if (!a.length) return b.length;
        if (!b.length) return a.length;
        const row = [];
        for (let j = 0; j <= b.length; j += 1) row[j] = j;
        for (let i = 1; i <= a.length; i += 1) {
            let prev = i - 1;
            row[0] = i;
            for (let j = 1; j <= b.length; j += 1) {
                const val = a[i - 1] === b[j - 1] ? prev : prev + 1;
                prev = row[j];
                row[j] = Math.min(val, row[j] + 1, row[j - 1] + 1);
            }
        }
        return row[b.length];
    }

    function dataUrl(file) {
        const base = (typeof window !== 'undefined' && window.location && window.location.href)
            ? window.location.href
            : '';
        return new URL('assets/data/' + file, base).href;
    }

    function loadJson(file) {
        return fetch(dataUrl(file), { cache: 'no-cache' }).then(function (res) {
            if (!res.ok) throw new Error('load_failed');
            return res.json();
        });
    }

    function init(options) {
        if (loadPromise) return loadPromise;
        const base = (options && options.basePath) || null;
        loadPromise = Promise.all([
            base
                ? fetch(base + 'israel-settlements.json', { cache: 'no-cache' }).then(function (res) {
                    if (!res.ok) throw new Error('load_failed');
                    return res.json();
                })
                : loadJson('israel-settlements.json'),
            base
                ? fetch(base + 'zip-general.json', { cache: 'no-cache' }).then(function (res) {
                    return res.ok ? res.json() : null;
                }).catch(function () { return null; })
                : loadJson('zip-general.json').catch(function () { return null; })
        ]).then(function (results) {
            settlements = Array.isArray(results[0]) ? results[0] : [];
            zipIndex = results[1] && typeof results[1] === 'object' ? results[1] : {};
            cityZipIndex = buildCityZipIndex(zipIndex);
            return true;
        }).catch(function () {
            settlements = [];
            zipIndex = {};
            cityZipIndex = {};
            return true;
        });
        return loadPromise;
    }

    function findSettlement(cityName, streetName) {
        if (!settlements || !settlements.length) return null;
        const city = normalizeName(cityName);
        const street = normalizeName(streetName);
        if (!city) return null;

        if (street) {
            const compound = city + ' ' + street;
            let match = settlements.find(function (s) {
                return normalizeName(s.name) === compound;
            });
            if (match) return { item: match, fuzzy: false };
        }

        let match = settlements.find(function (s) {
            return normalizeName(s.name) === city;
        });
        if (match) return { item: match, fuzzy: false };

        match = settlements.find(function (s) {
            const name = normalizeName(s.name);
            return name.indexOf(city) >= 0 || city.indexOf(name) >= 0;
        });
        if (match) return { item: match, fuzzy: true };

        let best = null;
        let bestDist = 999;
        settlements.forEach(function (s) {
            const name = normalizeName(s.name);
            if (name.length < 2) return;
            const maxLen = Math.max(city.length, name.length);
            const allowed = maxLen <= 4 ? 1 : 2;
            const dist = levenshtein(city, name);
            if (dist <= allowed && dist < bestDist) {
                bestDist = dist;
                best = s;
            }
        });
        if (best) return { item: best, fuzzy: true };
        return null;
    }

    function buildCityZipIndex(index) {
        const map = {};
        if (!index) return map;
        Object.keys(index).forEach(function (zip) {
            const rec = index[zip];
            if (!rec || !rec.city) return;
            const key = normalizeName(rec.city);
            if (!key) return;
            if (!map[key] || String(zip).endsWith('00')) {
                map[key] = zip;
            }
        });
        return map;
    }

    function lookupZipByCity(cityName) {
        if (!cityZipIndex || !cityName) return null;
        const key = normalizeName(cityName);
        if (!key) return null;

        if (cityZipIndex[key] && zipIndex[cityZipIndex[key]]) {
            return {
                zip: cityZipIndex[key],
                city: zipIndex[cityZipIndex[key]].city
            };
        }

        const settlement = findSettlement(cityName, '');
        if (settlement && settlement.item) {
            const skey = normalizeName(settlement.item.name);
            if (cityZipIndex[skey] && zipIndex[cityZipIndex[skey]]) {
                return {
                    zip: cityZipIndex[skey],
                    city: zipIndex[cityZipIndex[skey]].city
                };
            }
        }

        let bestKey = null;
        let bestDist = 999;
        Object.keys(cityZipIndex).forEach(function (name) {
            if (name.length < 2) return;
            const maxLen = Math.max(key.length, name.length);
            const allowed = maxLen <= 4 ? 1 : 2;
            const dist = levenshtein(key, name);
            if (dist <= allowed && dist < bestDist) {
                bestDist = dist;
                bestKey = name;
            }
        });
        if (bestKey && zipIndex[cityZipIndex[bestKey]]) {
            return {
                zip: cityZipIndex[bestKey],
                city: zipIndex[cityZipIndex[bestKey]].city
            };
        }
        return null;
    }

    function lookupByZip(zip) {
        if (!zipIndex || !zip) return null;
        if (zipIndex[zip]) return zipIndex[zip];

        // Israel Post street zips often share a prefix with the settlement's general zip.
        for (let len = 5; len >= 4; len -= 1) {
            const prefix = zip.slice(0, len);
            const matches = Object.keys(zipIndex).filter(function (key) {
                return key.startsWith(prefix);
            });
            if (!matches.length) continue;
            if (matches.length === 1) return zipIndex[matches[0]];

            const general = matches.find(function (key) { return key.endsWith('00'); });
            if (general) return zipIndex[general];

            matches.sort();
            return zipIndex[matches[0]];
        }

        return null;
    }

    function sleep(ms) {
        return new Promise(function (resolve) {
            setTimeout(resolve, ms);
        });
    }

    function normalizePostcode(raw) {
        const digits = String(raw || '').replace(/\D/g, '');
        return /^\d{7}$/.test(digits) ? digits : '';
    }

    async function nominatimSearch(params) {
        try {
            const query = new URLSearchParams({
                format: 'json',
                limit: '1',
                countrycodes: 'il',
                addressdetails: '1',
                'accept-language': 'he'
            });
            Object.keys(params).forEach(function (key) {
                if (params[key]) query.set(key, params[key]);
            });

            const res = await fetch('https://nominatim.openstreetmap.org/search?' + query.toString(), {
                headers: { Accept: 'application/json' }
            });
            if (!res.ok) return null;
            const data = await res.json();
            if (!Array.isArray(data) || !data.length) return null;
            const item = data[0];
            const address = item.address || {};
            return {
                lat: Number(item.lat),
                lon: Number(item.lon),
                postcode: normalizePostcode(address.postcode)
            };
        } catch (err) {
            return null;
        }
    }

    async function lookupStreetZip(fields) {
        const city = String(fields.city || '').trim();
        const street = String(fields.street || '').trim();
        const houseNumber = String(fields.houseNumber || '').trim();
        if (!city || !street || !houseNumber) return null;

        const result = await nominatimSearch({
            street: houseNumber + ' ' + street,
            city: city,
            country: 'Israel'
        });
        if (result && result.postcode) {
            return { zip: result.postcode, city: city, source: 'street' };
        }
        return null;
    }

    async function lookupZip(fields) {
        await init();
        const cityHit = lookupZipByCity(fields.city);
        const streetHit = await lookupStreetZip(fields);
        if (streetHit) return streetHit;
        if (cityHit) {
            return { zip: cityHit.zip, city: cityHit.city, source: 'city' };
        }
        return null;
    }

    function resultFromZip(zipHit, city) {
        const cityMatches = !city || normalizeName(city) === normalizeName(zipHit.city) ||
            levenshtein(normalizeName(city), normalizeName(zipHit.city)) <= 2;
        return {
            lat: Number(zipHit.lat),
            lon: Number(zipHit.lon),
            approximate: true,
            source: 'zip',
            resolvedCity: zipHit.city,
            cityMatches: cityMatches
        };
    }

    async function geocodeAddress(fields) {
        await init();
        const zip = String(fields.zip || '').replace(/\D/g, '');
        const city = String(fields.city || '').trim();
        const street = String(fields.street || '').trim();
        const houseNumber = String(fields.houseNumber || '').trim();

        if (/^\d{7}$/.test(zip)) {
            const zipHit = lookupByZip(zip);
            if (zipHit && zipHit.lat != null && zipHit.lon != null) {
                return resultFromZip(zipHit, city);
            }
        }

        const settlementHit = findSettlement(city, street);
        if (settlementHit && settlementHit.item) {
            return {
                lat: Number(settlementHit.item.lat),
                lon: Number(settlementHit.item.lon),
                approximate: true,
                source: 'settlement',
                resolvedCity: settlementHit.item.name,
                fuzzy: settlementHit.fuzzy
            };
        }

        const queries = [
            street + ' ' + houseNumber + ', ' + city + ', ' + zip + ', ישראל',
            street + ' ' + houseNumber + ', ' + city + ', ישראל',
            city + ', ' + zip + ', ישראל'
        ];

        for (let i = 0; i < queries.length; i += 1) {
            if (i > 0) await sleep(1100);
            const result = await nominatimSearch({ q: queries[i] });
            if (result) {
                return {
                    lat: result.lat,
                    lon: result.lon,
                    approximate: i > 0,
                    source: 'nominatim'
                };
            }
        }

        throw new Error('address_not_found');
    }

    global.DeliveryGeocode = {
        init: init,
        geocodeAddress: geocodeAddress,
        findSettlement: findSettlement,
        lookupByZip: lookupByZip,
        lookupZipByCity: lookupZipByCity,
        lookupZip: lookupZip
    };
})(window);
