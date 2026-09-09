// Main JavaScript for VIPO Product Page

// Initialize when DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // גלילה לראש העמוד בעת טעינה
    window.scrollTo(0, 0);
    
    // Initialize Swiper
    initSwiper();
    
    // Start the countdown
    startCountdown();
    
    // Initialize Share functionality
    initShareButtons();
});

// Initialize product gallery swiper
function initSwiper() {
    const swiper = new Swiper('.swiper', {
        loop: true,
        autoplay: {
            delay: 5000,
            disableOnInteraction: false,
        },
        pagination: {
            el: '.swiper-pagination',
            clickable: true,
        },
        navigation: {
            nextEl: '.swiper-button-next',
            prevEl: '.swiper-button-prev',
        },
        effect: 'fade',
        fadeEffect: {
            crossFade: true
        },
        speed: 800,
    });
}

// Function to add business days to a date
function addBusinessDays(startDate, days) {
    const date = new Date(startDate);
    let daysToAdd = days;
    while (daysToAdd > 0) {
        date.setDate(date.getDate() + 1);
        // Skip weekends (0 = Sunday, 6 = Saturday)
        if (date.getDay() !== 0 && date.getDay() !== 6) {
            daysToAdd--;
        }
    }
    // Set to end of business day (17:00)
    date.setHours(17, 0, 0, 0);
    return date;
}

// Initialize Countdown Timer
function startCountdown() {
    // Set the date we're counting down to (45 calendar days from now)
    const now = new Date();
    const countDownDate = new Date(now);
    countDownDate.setDate(now.getDate() + 45);
    countDownDate.setHours(23, 59, 59, 0); // End of day
    
    // Set initial display to 45 days
    const daysElement = document.querySelector('.countdown-value.days');
    if (daysElement) daysElement.textContent = '45';

    // Update the countdown every 1 second
    const x = setInterval(function() {
        // Get current date and time
        const now = new Date().getTime();

        // Find the distance between now and the countdown date
        const distance = countDownDate - now;

        // Time calculations for days, hours, minutes and seconds
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        // Display the result
        const daysElement = document.querySelector('.countdown-value.days');
        const hoursElement = document.querySelector('.countdown-value.hours');
        const minutesElement = document.querySelector('.countdown-value.minutes');
        const secondsElement = document.querySelector('.countdown-value.seconds');
        
        if (daysElement) daysElement.textContent = days.toString().padStart(2, '0');
        if (hoursElement) hoursElement.textContent = hours.toString().padStart(2, '0');
        if (minutesElement) minutesElement.textContent = minutes.toString().padStart(2, '0');
        if (secondsElement) secondsElement.textContent = seconds.toString().padStart(2, '0');

        // If the countdown is finished, display message
        if (distance < 0) {
            clearInterval(x);
            document.querySelector('.countdown-timer').innerHTML = '<div class="expired">המכולה הגיעה!</div>';
        }
    }, 1000);
}

// Format time to always show two digits (e.g., 01 instead of 1)
function formatTime(time) {
    return time < 10 ? `0${time}` : time;
}

// Initialize share buttons
function initShareButtons() {
    const map = [
        ['.btn-whatsapp', (url) => `https://wa.me/?text=${encodeURIComponent('בדקו את המוצר המדהים הזה! ' + url)}`],
        ['.btn-facebook', (url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`],
        ['.btn-telegram', (url) => `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent('בדקו את המוצר המדהים הזה!')}`],
    ];
    map.forEach(([sel, buildUrl]) => {
        const el = document.querySelector(sel);
        if (!el) return;
        el.addEventListener('click', function(e) {
            e.preventDefault();
            window.open(buildUrl(window.location.href), '_blank', 'noopener');
        });
    });

    const emailBtn = document.querySelector('.btn-email');
    if (emailBtn) {
        emailBtn.addEventListener('click', function(e) {
            e.preventDefault();
            const subject = 'מוצר מדהים שחשבתי שיעניין אותך';
            const body = `היי,\n\nבדקו את המוצר:\n${window.location.href}`;
            window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        });
    }
}

// Copy to clipboard function
function copyToClipboard() {
    const couponCode = document.getElementById('couponCode');
    const copyMessage = document.getElementById('copyMessage');
    
    couponCode.select();
    document.execCommand('copy');
    
    // Modern clipboard API (fallback to execCommand)
    if (navigator.clipboard) {
        navigator.clipboard.writeText(couponCode.value)
            .then(() => {
                showCopyMessage();
            })
            .catch(err => {
                console.error('Failed to copy: ', err);
            });
    } else {
        showCopyMessage();
    }
    
    function showCopyMessage() {
        copyMessage.style.opacity = '1';
        copyMessage.style.transform = 'translateY(0)';
        
        setTimeout(() => {
            copyMessage.style.opacity = '0';
            copyMessage.style.transform = 'translateY(-10px)';
        }, 2000);
    }
}
