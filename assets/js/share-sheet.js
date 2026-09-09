/**
 * שיתוף הדף — וואטסאפ, פייסבוק, טלגרם, העתקה, שיתוף מערכת
 */
(function () {
    const PRODUCT_TITLE = 'כורסת עיסוי VC - LUXURY';

    function $(sel) {
        return document.querySelector(sel);
    }

    function shareText() {
        return `${PRODUCT_TITLE}\n${window.location.href}`;
    }

    function buildUI() {
        if ($('#shareOverlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'shareOverlay';
        overlay.hidden = true;
        overlay.innerHTML = `
<div class="share-sheet" role="dialog" aria-labelledby="shareTitle" aria-modal="true">
  <div class="share-sheet-head">
    <button type="button" class="share-close" id="shareCloseBtn" aria-label="סגור"><i class="fas fa-times"></i></button>
    <h2 id="shareTitle">שתף את הדף</h2>
    <span style="width:40px"></span>
  </div>
  <p class="share-lead">בחר/י לאן לשלוח את הקישור</p>
  <div class="share-grid">
    <button type="button" class="share-option share-option--wa" data-share="whatsapp">
      <i class="fab fa-whatsapp"></i><span>WhatsApp</span>
    </button>
    <button type="button" class="share-option share-option--fb" data-share="facebook">
      <i class="fab fa-facebook-f"></i><span>Facebook</span>
    </button>
    <button type="button" class="share-option share-option--tg" data-share="telegram">
      <i class="fab fa-telegram-plane"></i><span>Telegram</span>
    </button>
    <button type="button" class="share-option share-option--copy" data-share="copy">
      <i class="fas fa-link"></i><span>העתק קישור</span>
    </button>
  </div>
  <p class="share-status" id="shareStatus" aria-live="polite"></p>
</div>`;
        document.body.appendChild(overlay);

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeShare();
        });
        $('#shareCloseBtn').addEventListener('click', closeShare);

        overlay.querySelectorAll('[data-share]').forEach((btn) => {
            btn.addEventListener('click', () => handleShare(btn.dataset.share));
        });
    }

    function setStatus(msg, ok) {
        const el = $('#shareStatus');
        if (!el) return;
        el.textContent = msg;
        el.classList.toggle('is-ok', !!ok);
    }

    function handleShare(type) {
        const url = window.location.href;
        const text = shareText();

        if (type === 'whatsapp') {
            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
            closeShare();
            return;
        }
        if (type === 'facebook') {
            window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank', 'noopener');
            closeShare();
            return;
        }
        if (type === 'telegram') {
            window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(PRODUCT_TITLE)}`, '_blank', 'noopener');
            closeShare();
            return;
        }
        if (type === 'copy') {
            const done = () => {
                setStatus('הקישור הועתק!', true);
                setTimeout(closeShare, 1200);
            };
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(url).then(done).catch(() => fallbackCopy(url, done));
            } else {
                fallbackCopy(url, done);
            }
        }
    }

    function fallbackCopy(text, cb) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try {
            document.execCommand('copy');
            cb();
        } catch (e) {
            setStatus('לא הצלחנו להעתיק — העתק/י ידנית מהשורת כתובת', false);
        }
        document.body.removeChild(ta);
    }

    async function tryNativeShare() {
        if (!navigator.share) return false;
        try {
            await navigator.share({
                title: PRODUCT_TITLE,
                text: PRODUCT_TITLE,
                url: window.location.href
            });
            return true;
        } catch (e) {
            if (e.name === 'AbortError') return true;
            return false;
        }
    }

    async function openShare() {
        buildUI();
        const usedNative = await tryNativeShare();
        if (usedNative) return;

        const overlay = $('#shareOverlay');
        if (!overlay) return;
        overlay.hidden = false;
        document.body.classList.add('share-open');
        setStatus('');
    }

    function closeShare() {
        const overlay = $('#shareOverlay');
        if (overlay) overlay.hidden = true;
        document.body.classList.remove('share-open');
        setStatus('');
    }

    function bindHeader() {
        const btn = $('.share-button');
        if (!btn) return;
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            openShare();
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        buildUI();
        bindHeader();
    });
})();
