(function () {
    var SCENES = [
        { src: 'assets/images/chair-cream-hires.png', kicker: 'ישירות מהמפעל', title: 'כורסת עיסוי VC LUXURY', sub: 'חוויית עיסוי מקצועית — בבית' },
        { src: 'assets/images/chair-cream-front.png', kicker: 'צבע שמנת', title: 'מבט קדמי', sub: 'עיצוב נקי לכל חדר' },
        { src: 'assets/images/chair-navy-hires.png', kicker: 'צבע נייבי', title: 'נוכחות שקטה', sub: 'שלושה צבעים לבחירה' },
        { src: 'assets/images/chair-black-hires.png', kicker: 'צבע שחור', title: 'גימור יוקרתי', sub: 'שמנת · נייבי · שחור' },
        { src: 'assets/images/features/internal-mechanism.png', kicker: 'טכנולוגיה', title: '5 מנועים + מסילת SL', sub: 'טיימר 15–30 דקות · לישה' },
        { src: 'assets/images/features/heating.png', kicker: 'חימום', title: 'Graphene', sub: 'גב · מותניים · רגליים' },
        { src: 'assets/images/features/leg-foot-massage.png', kicker: 'רגליים', title: 'גלילי כף רגל', sub: 'Foot Roller Kneading' },
        { src: 'assets/images/features/airbags.png', kicker: 'עיסוי עוטף', title: 'מערכת כריות אוויר', sub: 'לחיצה רכה לפי היצרן' },
        { src: 'assets/images/features/lcd-control-panel.png', kicker: 'שליטה', title: 'מסך LCD גדול', sub: 'שליטה קולית · 5 תוכניות' },
        { src: 'assets/images/features/speaker-detail.png', kicker: 'שמע', title: 'Bluetooth Hi-Fi', sub: 'מערכת שמע מובנית' },
        { src: 'assets/images/chair-cream-controls.png', kicker: 'נוחות', title: 'השליטה בהישג יד', sub: 'מסך · כפתורים · קול' },
        { src: 'assets/images/chair-navy-front.png', kicker: 'מפרט', title: '154 × 74 × 112 ס״מ', sub: '150W · 110–240V · 77 / 87 ק״ג' },
        { src: 'assets/images/chair-black-front.png', kicker: 'חומרים', title: 'עור PU + שלדת פלדה', sub: 'אריזה 150 × 76 × 110 ס״מ' },
        { src: 'assets/images/chair-navy-controls.png', kicker: 'צבעי קטלוג', title: 'חום / בז / כחול', sub: 'בתמונות: שמנת · נייבי · שחור' },
        { src: 'assets/images/chair-black-controls.png', kicker: 'שחור', title: 'לוח שליטה', sub: 'תפעול פשוט מכל זווית' },
        { src: 'assets/images/chair-cream-hires.png', kicker: 'מחיר מפעל', title: '₪4,900', sub: 'אחריות יצרן לשנה' }
    ];
    var HOLD = 2800;
    var fadeTimer = null;
    var holdTimer = null;
    var idx = 0;
    var usingA = true;
    var playing = false;

    function $(id) { return document.getElementById(id); }

    function init() {
        var wrap = $('explainerFilm');
        var imgA = $('filmA');
        var imgB = $('filmB');
        var playBtn = $('filmPlay');
        var pauseBtn = $('filmPause');
        var ctrl = $('filmCtrl');
        var bar = $('filmProgress');
        var kicker = $('filmKicker');
        var title = $('filmTitle');
        var sub = $('filmSub');
        if (!wrap || !imgA || !imgB || !playBtn) return;

        SCENES.forEach(function (s) {
            var im = new Image();
            im.src = s.src;
        });

        function caption(i) {
            var s = SCENES[i];
            if (kicker) kicker.textContent = s.kicker;
            if (title) title.textContent = s.title;
            if (sub) sub.textContent = s.sub;
        }

        function showSlide(i, instant) {
            var incoming = usingA ? imgB : imgA;
            var outgoing = usingA ? imgA : imgB;
            incoming.src = SCENES[i].src;
            incoming.alt = SCENES[i].title;
            if (instant) {
                incoming.classList.add('is-on');
                outgoing.classList.remove('is-on');
            } else {
                incoming.classList.add('is-on');
                outgoing.classList.remove('is-on');
            }
            usingA = !usingA;
            idx = i;
            caption(i);
            if (bar) bar.style.width = (((i + 1) / SCENES.length) * 100) + '%';
        }

        function next() {
            var n = idx + 1;
            if (n >= SCENES.length) {
                stop(true);
                return;
            }
            showSlide(n, false);
            holdTimer = window.setTimeout(next, HOLD);
        }

        function start() {
            if (playing) return;
            playing = true;
            wrap.classList.add('is-playing');
            playBtn.hidden = true;
            if (ctrl) ctrl.hidden = false;
            showSlide(0, true);
            window.setTimeout(function () {
                if (!playing) return;
                if (SCENES.length > 1) showSlide(1, false);
                holdTimer = window.setTimeout(next, HOLD);
            }, 350);
        }

        function stop(ended) {
            playing = false;
            wrap.classList.remove('is-playing');
            if (holdTimer) { window.clearTimeout(holdTimer); holdTimer = null; }
            if (fadeTimer) { window.clearTimeout(fadeTimer); fadeTimer = null; }
            playBtn.hidden = false;
            playBtn.querySelector('span').textContent = ended ? 'נגן שוב' : 'הפעל סרטון הסבר';
            if (ctrl) ctrl.hidden = true;
            if (ended) {
                showSlide(SCENES.length - 1, true);
            }
        }

        caption(0);
        imgA.src = SCENES[0].src;
        imgA.alt = SCENES[0].title;
        imgA.classList.add('is-on');
        imgB.classList.remove('is-on');

        playBtn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            start();
        });
        if (pauseBtn) {
            pauseBtn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                stop(false);
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
