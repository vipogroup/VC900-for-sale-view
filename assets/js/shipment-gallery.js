(function () {
    const STAGE_ORDER = ['production', 'loading', 'shipped', 'israel-port'];
    const PREVIEW_COUNT = 6;

    let stagesData = [];
    let currentStageId = 'shipped';
    let lightboxImages = [];
    let lightboxIndex = 0;
    let touchStartX = 0;

    function $(sel) {
        return document.querySelector(sel);
    }

    function $$(sel) {
        return document.querySelectorAll(sel);
    }

    function stageIndex(id) {
        return STAGE_ORDER.indexOf(id);
    }

    function stageMediaCount(stage) {
        const images = (stage.images || []).length;
        const videos = (stage.videos || []).length;
        return { images, videos, total: images + videos };
    }

    function stageMediaMeta(stage, i, currentIdx) {
        const counts = stageMediaCount(stage);
        const parts = [];
        if (counts.images) parts.push(counts.images + ' תמונות');
        if (counts.videos) parts.push(counts.videos + ' סרטונים');
        if (parts.length) return parts.join(' · ');
        return i <= currentIdx ? 'ממתין לתמונות' : 'בקרוב';
    }

    function stageStateClass(i, currentIdx) {
        if (i < currentIdx) return 'is-done';
        if (i === currentIdx) return 'is-current';
        return 'is-future';
    }

    function initReveal() {
        const nodes = document.querySelectorAll('.reveal:not(.is-visible)');
        if (!nodes.length) return;
        if (!('IntersectionObserver' in window)) {
            nodes.forEach(function (el) { el.classList.add('is-visible'); });
            return;
        }
        const io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    io.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -20px 0px' });
        nodes.forEach(function (el) { io.observe(el); });
    }

    function renderHeroProgress(stages, currentId) {
        const el = $('#sgHeroProgress');
        const jumpBtn = $('#sgJumpCurrent');
        if (!el) return;

        const idx = stageIndex(currentId);
        const total = stages.length;
        const current = stages[idx];
        const pct = total > 1 ? Math.round(((idx + 1) / total) * 100) : 100;

        el.innerHTML =
            '<div class="sg-progress-bar" role="progressbar" aria-valuenow="' + pct + '" aria-valuemin="0" aria-valuemax="100">' +
            '  <span class="sg-progress-fill" style="width:' + pct + '%"></span>' +
            '</div>' +
            '<p class="sg-progress-text">שלב ' + (idx + 1) + ' מתוך ' + total +
            (current ? ' · ' + current.label : '') + '</p>';

        if (jumpBtn) {
            jumpBtn.hidden = false;
            jumpBtn.onclick = function () {
                scrollToStage(currentId, true);
            };
        }
    }

    function renderStageNav(stages, currentId) {
        const wrap = $('#sgStageNavWrap');
        const nav = $('#sgStageNav');
        if (!wrap || !nav) return;

        const currentIdx = stageIndex(currentId);
        nav.innerHTML = stages.map(function (stage, i) {
            const cls = 'sg-nav-chip ' + stageStateClass(i, currentIdx);
            const counts = stageMediaCount(stage);
            const badge = counts.total ? ' (' + counts.total + ')' : '';
            return (
                '<button type="button" class="' + cls + '" data-stage="' + stage.id + '" role="tab">' +
                '<i class="fas ' + stage.icon + '"></i>' +
                '<span>' + stage.label + badge + '</span>' +
                '</button>'
            );
        }).join('');

        wrap.hidden = false;

        nav.querySelectorAll('.sg-nav-chip').forEach(function (btn) {
            btn.addEventListener('click', function () {
                scrollToStage(btn.dataset.stage || '', true);
            });
        });
    }

    let activeNavStageId = '';
    let scrollSpyEnabled = true;

    function scrollNavChipIntoView(chip) {
        const nav = $('#sgStageNav');
        if (!nav || !chip) return;
        const navRect = nav.getBoundingClientRect();
        const chipRect = chip.getBoundingClientRect();
        const delta = (chipRect.left + chipRect.width / 2) - (navRect.left + navRect.width / 2);
        nav.scrollLeft += delta;
    }

    function setActiveNav(stageId, options) {
        const opts = options || {};
        if (!stageId || (stageId === activeNavStageId && !opts.force)) return;
        activeNavStageId = stageId;

        $$('.sg-nav-chip').forEach(function (chip) {
            chip.classList.toggle('is-active', chip.dataset.stage === stageId);
        });

        if (opts.scrollChip) {
            const active = document.querySelector('.sg-nav-chip.is-active');
            scrollNavChipIntoView(active);
        }
    }

    function scrollToStage(stageId, smooth) {
        const section = document.getElementById('section-' + stageId);
        if (!section) return;

        scrollSpyEnabled = false;
        const navH = ($('#sgStageNavWrap') && !$('#sgStageNavWrap').hidden) ? 56 : 0;
        const top = section.getBoundingClientRect().top + window.scrollY - navH - 70;
        window.scrollTo({ top: Math.max(0, top), behavior: smooth ? 'smooth' : 'auto' });
        setActiveNav(stageId, { scrollChip: true, force: true });

        window.setTimeout(function () {
            scrollSpyEnabled = true;
        }, smooth ? 700 : 50);
    }

    function initScrollSpy(stages) {
        const sections = stages
            .map(function (s) { return document.getElementById('section-' + s.id); })
            .filter(Boolean);

        if (!sections.length || !('IntersectionObserver' in window)) return;

        const visibility = new Map();

        const io = new IntersectionObserver(function (entries) {
            if (!scrollSpyEnabled) return;

            entries.forEach(function (entry) {
                visibility.set(entry.target.id, entry.intersectionRatio);
            });

            let bestId = '';
            let bestRatio = 0;
            visibility.forEach(function (ratio, sectionId) {
                if (ratio > bestRatio) {
                    bestRatio = ratio;
                    bestId = sectionId.replace('section-', '');
                }
            });

            if (bestId && bestRatio >= 0.15) {
                setActiveNav(bestId);
            }
        }, { rootMargin: '-20% 0px -60% 0px', threshold: [0, 0.1, 0.25, 0.5, 0.75] });

        sections.forEach(function (sec) { io.observe(sec); });
    }

    function renderTrack(stages, currentId) {
        const track = $('#sgTrackSteps');
        if (!track) return;
        const currentIdx = stageIndex(currentId);

        track.innerHTML = stages.map(function (stage, i) {
            const cls = 'sg-step ' + stageStateClass(i, currentIdx);
            const meta = stageMediaMeta(stage, i, currentIdx);
            return (
                '<button type="button" class="' + cls + '" data-stage="' + stage.id + '">' +
                '  <div class="sg-step-icon"><i class="fas ' + stage.icon + '"></i></div>' +
                '  <div class="sg-step-body">' +
                '    <div class="sg-step-label">' + stage.label + '</div>' +
                '    <div class="sg-step-meta">' + meta + '</div>' +
                '  </div>' +
                '</button>'
            );
        }).join('');

        track.querySelectorAll('.sg-step').forEach(function (btn) {
            btn.addEventListener('click', function () {
                scrollToStage(btn.dataset.stage || '', true);
            });
        });
    }

    function bindSectionToggle(sectionEl) {
        const btn = sectionEl.querySelector('.sg-section-head-btn');
        if (!btn) return;
        btn.addEventListener('click', function () {
            const body = sectionEl.querySelector('.sg-section-body');
            sectionEl.classList.toggle('is-collapsed');
            if (!body) return;
            if (sectionEl.classList.contains('is-collapsed')) {
                body.style.maxHeight = '0';
            } else {
                body.style.maxHeight = body.scrollHeight + 'px';
            }
        });
    }

    function refreshSectionHeight(sectionEl) {
        if (!sectionEl || sectionEl.classList.contains('is-collapsed')) return;
        const body = sectionEl.querySelector('.sg-section-body');
        if (body) body.style.maxHeight = body.scrollHeight + 'px';
    }

    function bindShowMore(sectionEl) {
        const moreBtn = sectionEl.querySelector('.sg-show-more');
        if (!moreBtn) return;
        moreBtn.addEventListener('click', function () {
            sectionEl.querySelectorAll('.sg-thumb--hidden').forEach(function (thumb) {
                thumb.classList.remove('sg-thumb--hidden');
            });
            moreBtn.hidden = true;
            refreshSectionHeight(sectionEl);
        });
    }

    function getVideoPoster(stage, videoIdx) {
        const posters = stage.videoPosters || stage.posters || [];
        if (posters[videoIdx]) return posters[videoIdx];
        const images = stage.images || [];
        if (images[videoIdx]) return images[videoIdx];
        if (images.length) return images[Math.min(videoIdx, images.length - 1)];
        return '';
    }

    function renderVideoPreview(stage, src, idx) {
        const poster = getVideoPoster(stage, idx);
        const label = stage.label + ' · סרטון ' + (idx + 1);
        const posterHtml = poster
            ? '<img class="sg-video-poster" src="' + poster + '" alt="" loading="lazy">'
            : '<div class="sg-video-poster-fallback" aria-hidden="true"><i class="fas fa-film"></i></div>';

        return (
            '<button type="button" class="sg-video-preview" data-video-src="' + src + '" data-video-label="' + label + '" aria-label="הפעל ' + label + '">' +
            posterHtml +
            '<span class="sg-video-play" aria-hidden="true"><i class="fas fa-play"></i></span>' +
            '<span class="sg-video-label">סרטון ' + (idx + 1) + '</span>' +
            '</button>'
        );
    }

    function bindVideoPreviews(root) {
        (root || document).querySelectorAll('.sg-video-preview').forEach(function (btn) {
            btn.addEventListener('click', function () {
                openVideoModal(btn.dataset.videoSrc || '', btn.dataset.videoLabel || 'סרטון');
            });
        });
    }

    function openVideoModal(src, label) {
        const modal = $('#sgVideoModal');
        const player = $('#sgVideoPlayer');
        const caption = $('#sgVideoCaption');
        if (!modal || !player || !src) return;

        player.src = src;
        player.currentTime = 0;
        if (caption) caption.textContent = label || '';
        modal.hidden = false;
        document.body.classList.add('video-open');
        document.body.style.overflow = 'hidden';

        const playAttempt = player.play();
        if (playAttempt && playAttempt.catch) {
            playAttempt.catch(function () { /* autoplay blocked until user taps controls */ });
        }
    }

    function closeVideoModal() {
        const modal = $('#sgVideoModal');
        const player = $('#sgVideoPlayer');
        if (!modal) return;
        if (player) {
            player.pause();
            player.removeAttribute('src');
            player.load();
        }
        modal.hidden = true;
        document.body.classList.remove('video-open');
        if (!$('#sgLightbox') || $('#sgLightbox').hidden) {
            document.body.style.overflow = '';
        }
    }

    function buildLightboxList(stages, currentId) {
        const list = [];
        const currentIdx = stageIndex(currentId);
        stages.forEach(function (stage, i) {
            if (i > currentIdx && !stageMediaCount(stage).total) return;
            (stage.images || []).forEach(function (src, idx) {
                list.push({ src: src, label: stage.label + ' · תמונה ' + (idx + 1) });
            });
        });
        return list;
    }

    function renderGallery(stages, currentId) {
        const wrap = $('#sgGallery');
        const loading = $('#sgLoading');
        if (!wrap) return;

        const currentIdx = stageIndex(currentId);
        lightboxImages = buildLightboxList(stages, currentId);

        const html = stages.map(function (stage, i) {
            const counts = stageMediaCount(stage);
            if (i > currentIdx && !counts.total) return '';

            const videos = stage.videos || [];
            const videoItems = videos.map(function (src, idx) {
                return renderVideoPreview(stage, src, idx);
            }).join('');

            const videoBlock = videoItems
                ? '<div class="sg-videos">' +
                (videos.length > 1 ? '<p class="sg-video-hint">לחצ/י על תצוגה מקדימה להפעלת הסרטון</p>' : '') +
                videoItems +
                '</div>'
                : '';

            const images = stage.images || [];
            const hiddenFrom = images.length > PREVIEW_COUNT ? PREVIEW_COUNT : images.length;
            const imgs = images.map(function (src, idx) {
                const hiddenCls = idx >= hiddenFrom ? ' sg-thumb--hidden' : '';
                const lbIdx = lightboxImages.findIndex(function (item) { return item.src === src; });
                return (
                    '<button type="button" class="sg-thumb' + hiddenCls + (idx === 0 ? ' sg-thumb--tagged' : '') + '" data-src="' + src + '" data-lb-index="' + lbIdx + '" aria-label="תמונה ' + (idx + 1) + '">' +
                    '<img src="' + src + '" alt="' + stage.label + ' — מכולה קודמת ' + (idx + 1) + '" loading="lazy">' +
                    '</button>'
                );
            }).join('');

            const imageBlock = imgs ? '<div class="sg-grid">' + imgs + '</div>' : '';
            const extra = images.length - PREVIEW_COUNT;
            const showMoreBtn = extra > 0
                ? '<button type="button" class="sg-show-more"><i class="fas fa-images"></i><span>הצג עוד ' + extra + ' תמונות</span></button>'
                : '';

            const body = videoBlock || imageBlock
                ? videoBlock + imageBlock + showMoreBtn
                : '<div class="sg-empty"><i class="fas fa-hourglass-half"></i> עדיין אין תמונות לשלב זה — נעדכן בהקדם</div>';

            const countParts = [];
            if (counts.images) countParts.push(counts.images + ' תמונות');
            if (counts.videos) countParts.push(counts.videos + ' סרטונים');

            const delayClass = i === 0 ? ' reveal-delay-1' : i === 1 ? ' reveal-delay-2' : '';
            const collapsible = counts.total > 4 ? ' is-collapsible' : '';

            return (
                '<section class="sg-section reveal' + delayClass + collapsible + '" id="section-' + stage.id + '">' +
                '  <div class="sec-card">' +
                '    <div class="sg-section-head">' +
                '      <div class="sg-section-icon"><i class="fas ' + stage.icon + '"></i></div>' +
                '      <h2>' + stage.label + '</h2>' +
                '      <span class="sg-count">' + countParts.join(' · ') + '</span>' +
                (counts.total > 4
                    ? '<button type="button" class="sg-section-head-btn" aria-label="כווץ/הרחב"><i class="fas fa-chevron-up"></i></button>'
                    : '') +
                '    </div>' +
                '    <div class="sg-section-body">' + body + '</div>' +
                '  </div>' +
                '</section>'
            );
        }).join('');

        if (loading) loading.hidden = true;
        wrap.insertAdjacentHTML('beforeend', html);

        wrap.querySelectorAll('.sg-section.is-collapsible').forEach(function (sectionEl) {
            const body = sectionEl.querySelector('.sg-section-body');
            if (body) body.style.maxHeight = body.scrollHeight + 'px';
            bindSectionToggle(sectionEl);
        });

        wrap.querySelectorAll('.sg-section').forEach(bindShowMore);

        wrap.querySelectorAll('.sg-thumb').forEach(function (btn) {
            btn.addEventListener('click', function () {
                const idx = parseInt(btn.dataset.lbIndex, 10);
                openLightbox(Number.isFinite(idx) ? idx : 0);
            });
        });

        bindVideoPreviews(wrap);

        initReveal();
        initScrollSpy(stages);
    }

    function updateLightboxView() {
        const lb = $('#sgLightbox');
        const img = $('#sgLightboxImg');
        const caption = $('#sgLightboxCaption');
        const counter = $('#sgLightboxCounter');
        const prev = $('#sgLightboxPrev');
        const next = $('#sgLightboxNext');
        if (!lb || !img || !lightboxImages.length) return;

        const item = lightboxImages[lightboxIndex];
        img.src = item.src;
        img.alt = item.label;
        if (caption) caption.textContent = item.label;
        if (counter) counter.textContent = (lightboxIndex + 1) + ' / ' + lightboxImages.length;
        if (prev) prev.disabled = lightboxIndex <= 0;
        if (next) next.disabled = lightboxIndex >= lightboxImages.length - 1;
    }

    function openLightbox(index) {
        const lb = $('#sgLightbox');
        if (!lb || !lightboxImages.length) return;
        lightboxIndex = Math.max(0, Math.min(index, lightboxImages.length - 1));
        updateLightboxView();
        lb.hidden = false;
        document.body.classList.add('lb-open');
        document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
        const lb = $('#sgLightbox');
        if (!lb) return;
        lb.hidden = true;
        document.body.classList.remove('lb-open');
        document.body.style.overflow = '';
    }

    function stepLightbox(delta) {
        if (!lightboxImages.length) return;
        const next = lightboxIndex + delta;
        if (next < 0 || next >= lightboxImages.length) return;
        lightboxIndex = next;
        updateLightboxView();
    }

    function initTopButton() {
        const btn = $('#sgTopBtn');
        if (!btn) return;
        btn.addEventListener('click', function () {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        window.addEventListener('scroll', function () {
            btn.hidden = window.scrollY < 320;
        }, { passive: true });
    }

    function initLightboxGestures() {
        const lb = $('#sgLightbox');
        if (!lb) return;
        lb.addEventListener('touchstart', function (e) {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });
        lb.addEventListener('touchend', function (e) {
            const diff = e.changedTouches[0].screenX - touchStartX;
            if (Math.abs(diff) < 50) return;
            stepLightbox(diff > 0 ? -1 : 1);
        }, { passive: true });
    }

    async function init() {
        try {
            const [manifest, config] = await Promise.all([
                fetch('shipment-images.json?_=' + Date.now()).then(function (r) { return r.json(); }),
                fetch('config.json?_=' + Date.now()).then(function (r) { return r.json(); }).catch(function () { return {}; })
            ]);
            stagesData = manifest.stages || [];
            currentStageId = (config.shipment && config.shipment.currentStage) || 'shipped';

            renderHeroProgress(stagesData, currentStageId);
            renderStageNav(stagesData, currentStageId);
            renderTrack(stagesData, currentStageId);
            renderGallery(stagesData, currentStageId);
            setActiveNav(currentStageId, { force: true });
            initReveal();
        } catch (err) {
            const loading = $('#sgLoading');
            if (loading) {
                loading.innerHTML = '<div class="sg-empty sec-card">לא הצלחנו לטעון את הגלריה — נסו לרענן את הדף</div>';
            }
        }
    }

    document.addEventListener('DOMContentLoaded', function () {
        const closeBtn = $('#sgLightboxClose');
        const prevBtn = $('#sgLightboxPrev');
        const nextBtn = $('#sgLightboxNext');
        const lb = $('#sgLightbox');

        if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
        if (prevBtn) prevBtn.addEventListener('click', function () { stepLightbox(-1); });
        if (nextBtn) nextBtn.addEventListener('click', function () { stepLightbox(1); });
        if (lb) {
            lb.addEventListener('click', function (e) {
                if (e.target === lb) closeLightbox();
            });
        }

        const videoClose = $('#sgVideoClose');
        const videoModal = $('#sgVideoModal');
        if (videoClose) videoClose.addEventListener('click', closeVideoModal);
        if (videoModal) {
            videoModal.addEventListener('click', function (e) {
                if (e.target === videoModal) closeVideoModal();
            });
        }

        initTopButton();
        initLightboxGestures();
        init();
    });

    document.addEventListener('keydown', function (e) {
        const videoModal = $('#sgVideoModal');
        if (videoModal && !videoModal.hidden) {
            if (e.key === 'Escape') closeVideoModal();
            return;
        }
        const lb = $('#sgLightbox');
        if (!lb || lb.hidden) return;
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowRight') stepLightbox(-1);
        if (e.key === 'ArrowLeft') stepLightbox(1);
    });
})();
