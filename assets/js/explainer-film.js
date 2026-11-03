(function () {
    var SCENES = [
        { src: 'assets/images/chair-brown-hero.jpg', kicker: 'ישירות מהמפעל', title: 'כורסת עיסוי VIPO VC900', sub: 'עיסוי 4D עם שליטה מותאמת אישית' },
        { src: 'assets/images/chair-brown-front.jpg', kicker: 'צבע חום', title: 'מבט קדמי', sub: 'עיצוב נקי לכל חדר' },
        { src: 'assets/images/chair-white-front.jpg', kicker: 'צבע לבן', title: 'גימור בהיר', sub: 'חום / לבן' },
        { src: 'assets/images/features/back-roller.jpg', kicker: 'טכנולוגיה', title: '4D Precision PRO + SL', sub: '12 תוכניות · לישה · הקשה' },
        { src: 'assets/images/features/heating.jpg', kicker: 'חימום', title: 'חימום מובנה', sub: 'הפעלה מממשק השליטה' },
        { src: 'assets/images/features/leg-foot-massage.webp', kicker: 'רגליים', title: 'גלילי כף רגל', sub: 'לישה לשוקיים · מנוחה נשלפת' },
        { src: 'assets/images/features/leg-airbag.jpg', kicker: 'עיסוי עוטף', title: 'מערכת Airbags', sub: 'בחירת אזורים · 3 דרגות' },
        { src: 'assets/images/features/zero-gravity-lifestyle.webp', kicker: 'נוחות', title: 'Zero Gravity', sub: '3 מצבים · Wall Saver כ־5 ס״מ' },
        { src: 'assets/images/chair-brown-screen.jpg', kicker: 'שליטה', title: 'מסך מגע LCD', sub: 'שליטה קולית AI · 12 תוכניות' },
        { src: 'assets/images/features/speaker-detail.jpg', kicker: 'שמע', title: 'Bluetooth', sub: 'שמע מובנה · Breathing Light' },
        { src: 'assets/images/features/controls-tablet-knob.webp', kicker: 'Health', title: 'HR / SpO2', sub: 'אינדיקציה בממשק — לא מכשיר רפואי' },
        { src: 'assets/images/chair-brown-side.jpg', kicker: 'מפרט', title: '148 × 87 × 108 ס״מ', sub: '150W · 110–240V · 74 / 84 ק״ג' },
        { src: 'assets/images/chair-brown-3q.jpg', kicker: 'חומרים', title: 'PU + ABS + פלדה', sub: 'אריזה 121 × 76 × 110 ס״מ' },
        { src: 'assets/images/features/wireless-charging.jpg', kicker: 'נוחות', title: 'טעינה אלחוטית', sub: 'במשענת היד' }
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
