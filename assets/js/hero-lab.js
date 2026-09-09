/**
 * Hero Lab — carousel, lightbox, scroll reveal, countdown, video
 */
(function () {
    var COLORS = [
        {
            hex: '#4a2f24',
            label: 'חום',
            images: [
                { src: 'assets/images/chair-brown-hero.jpg', angle: 'תלת רבע' },
                { src: 'assets/images/chair-brown-front.jpg', angle: 'חזית' },
                { src: 'assets/images/chair-brown-screen.jpg', angle: 'מסך' },
                { src: 'assets/images/chair-brown-3q.jpg', angle: 'זווית' },
                { src: 'assets/images/chair-brown-side.jpg', angle: 'פרופיל' },
                { src: 'assets/images/chair-brown-rear.jpg', angle: 'אחורי' },
                { src: 'assets/images/chair-brown-lifestyle.jpg', angle: 'בסלון' }
            ]
        },
        {
            hex: '#e8e4dc',
            label: 'לבן',
            images: [
                { src: 'assets/images/chair-white-hero.jpg', angle: 'תלת רבע' },
                { src: 'assets/images/chair-white-front.jpg', angle: 'חזית' },
                { src: 'assets/images/chair-white-screen.jpg', angle: 'מסך' },
                { src: 'assets/images/chair-white-3q.jpg', angle: 'זווית' },
                { src: 'assets/images/chair-white-side.jpg', angle: 'פרופיל' },
                { src: 'assets/images/chair-white-rear.jpg', angle: 'אחורי' }
            ]
        }
    ];
    var ROTATE_MS = 3800;
    var FADE_MS = 650;
    var RESUME_MS = 6000;
    var currentSrc = COLORS[0].images[0].src;
    var galleryCtrl = null;

    function initGallery() {
        var media = document.querySelector('.vp-stage-media');
        var slideEls = media ? media.querySelectorAll('.vp-slide') : [];
        var dotsEl = document.getElementById('vpDots');
        var swEl = document.getElementById('vpSwatches');
        if (!media || slideEls.length < 2 || !dotsEl || !swEl) return;

        var colorIdx = 0;
        var angleIdx = 0;
        var front = 0;
        var locked = false;
        var animating = false;
        var timer = null;
        var resumeTimer = null;

        COLORS.forEach(function (c) {
            c.images.forEach(function (img) {
                var preload = new Image();
                preload.src = img.src;
            });
        });

        COLORS.forEach(function (c, i) {
            var sw = document.createElement('button');
            sw.type = 'button';
            sw.className = 'vp-swatch';
            sw.style.background = c.hex;
            sw.setAttribute('title', c.label);
            sw.setAttribute('aria-label', c.label);
            sw.addEventListener('click', function () { lockColor(i); });
            swEl.appendChild(sw);
        });

        function rebuildDots() {
            dotsEl.innerHTML = '';
            COLORS[colorIdx].images.forEach(function (img, i) {
                var dot = document.createElement('button');
                dot.type = 'button';
                dot.className = 'vp-dot';
                dot.setAttribute('aria-label', COLORS[colorIdx].label + ' — ' + img.angle);
                dot.addEventListener('click', function () { lockAngle(i); });
                dotsEl.appendChild(dot);
            });
        }

        function updateIndicators() {
            Array.prototype.forEach.call(dotsEl.children, function (d, di) {
                d.classList.toggle('is-on', di === angleIdx);
            });
            Array.prototype.forEach.call(swEl.children, function (s, si) {
                s.classList.toggle('is-on', si === colorIdx);
            });
        }

        function setSlideSrc(el, src) {
            if (el.getAttribute('src') === src) return Promise.resolve();
            return new Promise(function (resolve) {
                function done() { resolve(); }
                el.onload = done;
                el.onerror = done;
                el.src = src;
                if (el.complete) {
                    el.onload = null;
                    if (el.decode) {
                        el.decode().then(done).catch(done);
                    } else {
                        done();
                    }
                }
            });
        }

        function show(nextColor, nextAngle) {
            var color = COLORS[nextColor];
            var nextSrc = color.images[nextAngle].src;
            var colorChanged = nextColor !== colorIdx;
            if (animating || nextSrc === currentSrc) {
                colorIdx = nextColor;
                angleIdx = nextAngle;
                if (colorChanged) rebuildDots();
                updateIndicators();
                return;
            }

            var currentEl = slideEls[front];
            var nextEl = slideEls[1 - front];
            animating = true;

            setSlideSrc(nextEl, nextSrc).then(function () {
                nextEl.alt = 'כורסת עיסוי ' + color.label + ' — ' + color.images[nextAngle].angle;
                nextEl.classList.add('is-active');
                currentEl.classList.remove('is-active');
                front = 1 - front;
                colorIdx = nextColor;
                angleIdx = nextAngle;
                currentSrc = nextSrc;
                if (colorChanged) rebuildDots();
                updateIndicators();
                setTimeout(function () { animating = false; }, FADE_MS);
            });
        }

        function pauseAuto() {
            locked = true;
            clearInterval(timer);
            timer = null;
            clearTimeout(resumeTimer);
        }

        function lockColor(i) {
            pauseAuto();
            show(i, 0);
            scheduleResume();
        }

        function lockAngle(i) {
            pauseAuto();
            show(colorIdx, i);
            scheduleResume();
        }

        function stepAngle(dir) {
            var total = COLORS[colorIdx].images.length;
            var next = (angleIdx + dir + total) % total;
            pauseAuto();
            show(colorIdx, next);
            scheduleResume();
        }

        function scheduleResume() {
            if (RESUME_MS > 0) {
                resumeTimer = setTimeout(function () {
                    locked = false;
                    show(colorIdx, 0);
                    startAuto();
                }, RESUME_MS);
            }
        }

        function startAuto() {
            clearInterval(timer);
            timer = setInterval(function () {
                if (locked || animating) return;
                var nextColor = (colorIdx + 1) % COLORS.length;
                show(nextColor, 0);
            }, ROTATE_MS);
        }

        function bindSwipe(el) {
            var startX = 0;
            var startY = 0;
            var tracking = false;
            var swiped = false;

            function onStart(x, y) {
                startX = x;
                startY = y;
                tracking = true;
                swiped = false;
            }

            function onMove(x, y) {
                if (!tracking) return;
                if (Math.abs(x - startX) > 12 && Math.abs(x - startX) > Math.abs(y - startY)) {
                    swiped = true;
                }
            }

            function onEnd(x) {
                if (!tracking) return;
                tracking = false;
                var dx = x - startX;
                if (Math.abs(dx) < 40) return;
                if (dx < 0) stepAngle(1);
                else stepAngle(-1);
            }

            el.addEventListener('touchstart', function (e) {
                if (e.target.closest('.vp-stage-bar')) return;
                onStart(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
            }, { passive: true });
            el.addEventListener('touchmove', function (e) {
                if (!tracking) return;
                onMove(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
            }, { passive: true });
            el.addEventListener('touchend', function (e) {
                onEnd(e.changedTouches[0].clientX);
            });

            el.addEventListener('pointerdown', function (e) {
                if (e.pointerType === 'touch') return;
                if (e.target.closest('.vp-stage-bar')) return;
                onStart(e.clientX, e.clientY);
            });
            el.addEventListener('pointerup', function (e) {
                if (e.pointerType === 'touch') return;
                onEnd(e.clientX);
            });

            el._vpSwiped = function () { return swiped; };
        }

        var stage = document.getElementById('vpStage');
        if (stage) bindSwipe(stage);

        rebuildDots();
        updateIndicators();
        startAuto();

        galleryCtrl = {
            step: function (dir) {
                var total = COLORS[colorIdx].images.length;
                var next = (angleIdx + dir + total) % total;
                pauseAuto();
                locked = true;
                show(colorIdx, next);
                var color = COLORS[colorIdx];
                var img = color.images[next];
                return {
                    src: img.src,
                    alt: 'כורסת עיסוי ' + color.label + ' — ' + img.angle,
                    index: next + 1,
                    total: total
                };
            },
            current: function () {
                var color = COLORS[colorIdx];
                var img = color.images[angleIdx];
                return {
                    src: img.src,
                    alt: 'כורסת עיסוי ' + color.label + ' — ' + img.angle,
                    index: angleIdx + 1,
                    total: color.images.length
                };
            }
        };
    }

    function initLightbox() {
        var lb = document.getElementById('s6Lb');
        var lbImg = document.getElementById('s6LbImg');
        var lbCount = document.getElementById('s6LbCount');
        var stage = document.getElementById('vpStage');
        var closeBtn = document.getElementById('s6LbClose');
        var prevBtn = document.getElementById('s6LbPrev');
        var nextBtn = document.getElementById('s6LbNext');
        if (!lb || !lbImg || !stage) return;

        function sync() {
            if (!galleryCtrl) return;
            var cur = galleryCtrl.current();
            lbImg.src = cur.src;
            lbImg.alt = cur.alt;
            if (lbCount) lbCount.textContent = cur.index + ' / ' + cur.total;
        }

        function open() {
            sync();
            lb.classList.add('is-open');
            document.body.classList.add('lb-open');
        }

        function close() {
            lb.classList.remove('is-open');
            document.body.classList.remove('lb-open');
        }

        function step(dir) {
            if (!galleryCtrl) return;
            var cur = galleryCtrl.step(dir);
            lbImg.src = cur.src;
            lbImg.alt = cur.alt;
            if (lbCount) lbCount.textContent = cur.index + ' / ' + cur.total;
        }

        stage.addEventListener('click', function (e) {
            if (e.target.closest('.vp-stage-bar')) return;
            if (stage._vpSwiped && stage._vpSwiped()) return;
            open();
        });
        if (closeBtn) closeBtn.addEventListener('click', close);
        if (prevBtn) prevBtn.addEventListener('click', function (e) { e.stopPropagation(); step(-1); });
        if (nextBtn) nextBtn.addEventListener('click', function (e) { e.stopPropagation(); step(1); });
        lb.addEventListener('click', function (e) {
            if (e.target === lb) close();
        });

        var startX = 0;
        var tracking = false;
        lbImg.addEventListener('touchstart', function (e) {
            tracking = true;
            startX = e.changedTouches[0].clientX;
        }, { passive: true });
        lbImg.addEventListener('touchend', function (e) {
            if (!tracking) return;
            tracking = false;
            var dx = e.changedTouches[0].clientX - startX;
            if (Math.abs(dx) < 40) return;
            step(dx < 0 ? 1 : -1);
        });

        document.addEventListener('keydown', function (e) {
            if (!lb.classList.contains('is-open')) return;
            if (e.key === 'Escape') close();
            if (e.key === 'ArrowLeft') step(1);
            if (e.key === 'ArrowRight') step(-1);
        });
    }

    function initReveal() {
        var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        var reveals = document.querySelectorAll('.reveal');
        if (!reveals.length) return;

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
        reveals.forEach(function (el) { observer.observe(el); });

        function countUp(el, target, dur, dec) {
            var start = performance.now();
            function step(now) {
                var p = Math.min((now - start) / dur, 1);
                var eased = 1 - Math.pow(1 - p, 3);
                el.textContent = dec ? (target * eased).toFixed(dec) : Math.round(target * eased);
                if (p < 1) requestAnimationFrame(step);
            }
            requestAnimationFrame(step);
        }

        var counted = new WeakSet();
        var numObs = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting && !counted.has(entry.target)) {
                    counted.add(entry.target);
                    var raw = entry.target.textContent.trim();
                    var dec = raw.indexOf('.') > -1 ? 1 : 0;
                    var target = parseFloat(raw);
                    if (!isNaN(target)) {
                        if (reduce) {
                            entry.target.textContent = raw;
                        } else {
                            countUp(entry.target, target, 1200, dec);
                        }
                    }
                    numObs.unobserve(entry.target);
                }
            });
        }, { threshold: 0.6 });
        document.querySelectorAll('.s2-stat-num:not(.stock-sold-count):not(.stock-total-count):not(.stock-left-count), .s4-avg').forEach(function (el) {
            numObs.observe(el);
        });
    }

    function pad(n) {
        return String(n).padStart(2, '0');
    }

    var countdownInterval = null;

    function startCountdown(endDate) {
        if (countdownInterval) {
            clearInterval(countdownInterval);
            countdownInterval = null;
        }

        var end;
        if (endDate) {
            end = new Date(endDate).getTime();
        } else {
            var d = new Date();
            d.setDate(d.getDate() + 45);
            d.setHours(23, 59, 59, 0);
            end = d.getTime();
        }

        function tick() {
            var distance = end - Date.now();
            var dEl = document.getElementById('s2d');
            var hEl = document.getElementById('s2h');
            var mEl = document.getElementById('s2m');
            var sEl = document.getElementById('s2s');
            if (distance < 0) {
                if (dEl) dEl.textContent = '0';
                if (hEl) hEl.textContent = '00';
                if (mEl) mEl.textContent = '00';
                if (sEl) sEl.textContent = '00';
                return;
            }
            var days = Math.floor(distance / (1000 * 60 * 60 * 24));
            var hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            var seconds = Math.floor((distance % (1000 * 60)) / 1000);
            if (dEl) dEl.textContent = String(days);
            if (hEl) hEl.textContent = pad(hours);
            if (mEl) mEl.textContent = pad(minutes);
            if (sEl) sEl.textContent = pad(seconds);
        }

        tick();
        countdownInterval = setInterval(tick, 1000);
    }

    function initStickyHide() {
        var sticky = document.querySelector('.vp-sticky');
        var footer = document.querySelector('.vp-footer');
        if (!sticky || !footer) return;
        var fObs = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                sticky.classList.toggle('is-hidden', entry.isIntersecting);
            });
        }, { threshold: 0.06 });
        fObs.observe(footer);
    }

    document.addEventListener('DOMContentLoaded', function () {
        initGallery();
        initLightbox();
        initReveal();
        initStickyHide();
        startCountdown();
    });

    document.addEventListener('vipo:config-loaded', function (e) {
        var cfg = e.detail || {};
        startCountdown(cfg.endDate);
    });
})();
