/**
 * VIPO Product Loader
 * סקריפט להטמעה אוטומטית של תמונות ומפרט טכני בדף המוצר
 */

document.addEventListener('DOMContentLoaded', function() {
    // בדיקה אם קיים קובץ config.json
    checkForConfigFile();
});

/**
 * בודק אם קיים קובץ config.json ומטעין אותו
 */
function checkForConfigFile() {
    fetch('config.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('קובץ config.json לא נמצא. יוצר קובץ חדש...');
            }
            return response.json();
        })
        .then(config => {
            console.log('קובץ config.json נטען בהצלחה:', config);
            loadProductData(config);
            document.dispatchEvent(new CustomEvent('vipo:config-loaded', { detail: config }));
        })
        .catch(error => {
            console.log(error.message);
            // יצירת קובץ config.json לדוגמה
            createExampleConfigFile();
        });
}

/**
 * יוצר קובץ config.json לדוגמה
 */
function createExampleConfigFile() {
    console.log('יוצר קובץ config.json לדוגמה...');
    
    // לא מציג הודעה למשתמש - הוסר לפי בקשה
    
    // דוגמה לקובץ config.json
    const exampleConfig = {
        productName: "שם המוצר",
        productDescription: "תיאור קצר של המוצר",
        price: 1599,
        discountPrice: 1299,
        currency: "₪",
        endDate: "2026-10-09T23:59:59",
        imagesFolder: "product-images",
        specFile: "product-spec.html",
        participants: 32,
        contactPhone: "0533752633"
    };
    
    // הצגת הקוד לקובץ config.json
    console.log('דוגמה לקובץ config.json:');
    console.log(JSON.stringify(exampleConfig, null, 2));
}

/**
 * טוען את נתוני המוצר מהקובץ config.json
 */
function loadProductData(config) {
    // טעינת תמונות מהתיקייה
    if (config.imagesFolder) {
        loadProductImages(config.imagesFolder);
    }
    
    // טעינת מפרט טכני מקובץ HTML
    if (config.specFile) {
        loadProductSpec(config.specFile);
    }
    
    // עדכון פרטי המוצר
    updateProductDetails(config);
}

/**
 * טוען תמונות מתיקייה לגלריית המוצר
 */
function loadProductImages(imagesFolder) {
    console.log(`טוען תמונות מהתיקייה: ${imagesFolder}`);
    
    // שליחת בקשה לשרת לקבלת רשימת התמונות בתיקייה
    fetch(`list-images.php?folder=${imagesFolder}`)
        .then(response => response.json())
        .then(images => {
            if (images && images.length > 0) {
                updateProductGallery(images);
            } else {
                console.log('לא נמצאו תמונות בתיקייה');
            }
        })
        .catch(error => {
            console.error('שגיאה בטעינת התמונות:', error);
            
            // לא מציג הודעה למשתמש - הוסר לפי בקשה
            
            // דוגמה לקוד PHP
            console.log('דוגמה לקוד PHP לקובץ list-images.php:');
            console.log(`
<?php
header('Content-Type: application/json');

$folder = isset($_GET['folder']) ? $_GET['folder'] : '';
$allowed_extensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
$images = [];

if (!empty($folder) && is_dir($folder)) {
    $files = scandir($folder);
    
    foreach ($files as $file) {
        $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
        if (in_array($ext, $allowed_extensions)) {
            $images[] = [
                'path' => $folder . '/' . $file,
                'name' => pathinfo($file, PATHINFO_FILENAME)
            ];
        }
    }
}

echo json_encode($images);
?>
            `);
        });
}

/**
 * מעדכן את גלריית התמונות עם התמונות שנטענו
 */
function updateProductGallery(images) {
    const swiperWrapper = document.querySelector('.swiper-wrapper');
    if (!swiperWrapper) return;
    
    // ניקוי הגלריה הקיימת
    swiperWrapper.innerHTML = '';
    
    // הוספת התמונות החדשות
    images.forEach((image, index) => {
        const slide = document.createElement('div');
        slide.className = 'swiper-slide';
        
        // בדיקה אם זה קובץ וידאו
        const isVideo = ['mp4', 'webm', 'ogg'].includes(
            image.path.split('.').pop().toLowerCase()
        );
        
        if (isVideo) {
            slide.innerHTML = `
                <video controls class="img-fluid" preload="metadata">
                    <source src="${image.path}" type="video/${image.path.split('.').pop().toLowerCase()}">
                    הדפדפן שלך לא תומך בהצגת וידאו.
                </video>
                <div class="slide-overlay video-overlay"></div>
            `;
        } else {
            slide.innerHTML = `
                <img src="${image.path}" alt="${image.name || 'תמונת מוצר ' + (index + 1)}" class="img-fluid" loading="lazy">
                <div class="slide-overlay"></div>
            `;
        }
        
        swiperWrapper.appendChild(slide);
    });
    
    // עדכון מספר התמונות בתג
    const galleryBadge = document.querySelector('.gallery-badge');
    if (galleryBadge) {
        const videoCount = images.filter(img => 
            ['mp4', 'webm', 'ogg'].includes(img.path.split('.').pop().toLowerCase())
        ).length;
        
        const imageCount = images.length - videoCount;
        
        if (videoCount > 0) {
            galleryBadge.textContent = `${imageCount} תמונות + ${videoCount} וידאו`;
        } else {
            galleryBadge.textContent = `${imageCount} תמונות`;
        }
    }
    
    // אתחול מחדש של Swiper
    if (window.productSwiper) {
        window.productSwiper.destroy();
    }
    
    window.productSwiper = new Swiper('.product-swiper', {
        slidesPerView: 1,
        spaceBetween: 0,
        loop: true,
        autoplay: {
            delay: 5000,
            disableOnInteraction: false
        },
        pagination: {
            el: '.swiper-pagination',
            clickable: true
        },
        navigation: {
            nextEl: '.swiper-button-next',
            prevEl: '.swiper-button-prev'
        }
    });
}

/**
 * טוען מפרט טכני מקובץ HTML
 */
function loadProductSpec(specFile) {
    console.log(`טוען מפרט טכני מהקובץ: ${specFile}`);
    
    fetch(specFile)
        .then(response => {
            if (!response.ok) {
                throw new Error(`הקובץ ${specFile} לא נמצא`);
            }
            return response.text();
        })
        .then(html => {
            // מציאת האזור להטמעת המפרט הטכני
            const specTabContent = document.querySelector('#specTab');
            if (specTabContent) {
                specTabContent.innerHTML = html;
            } else {
                console.error('לא נמצא אזור להטמעת המפרט הטכני');
            }
        })
        .catch(error => {
            console.error('שגיאה בטעינת המפרט הטכני:', error);
            
            // הודעה למשתמש
            const specMessage = document.createElement('div');
            specMessage.className = 'config-message';
            specMessage.innerHTML = `
                <div class="alert alert-warning alert-dismissible fade show" role="alert">
                    <h4>קובץ מפרט טכני</h4>
                    <p>הקובץ <strong>${specFile}</strong> לא נמצא.</p>
                    <p>צור קובץ HTML עם המפרט הטכני של המוצר.</p>
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="סגור"></button>
                </div>
            `;
            document.body.prepend(specMessage);
            
            // דוגמה לקובץ מפרט טכני
            console.log('דוגמה לקובץ מפרט טכני:');
            console.log(`
<div class="product-specs">
    <h4>מפרט טכני מלא</h4>
    <div class="specs-table">
        <div class="spec-row">
            <div class="spec-name">מעבד</div>
            <div class="spec-value">Intel Core i7-12700H</div>
        </div>
        <div class="spec-row">
            <div class="spec-name">זיכרון</div>
            <div class="spec-value">16GB DDR4</div>
        </div>
        <div class="spec-row">
            <div class="spec-name">אחסון</div>
            <div class="spec-value">SSD 512GB NVMe</div>
        </div>
        <div class="spec-row">
            <div class="spec-name">מסך</div>
            <div class="spec-value">15.6" FHD IPS 144Hz</div>
        </div>
        <div class="spec-row">
            <div class="spec-name">כרטיס מסך</div>
            <div class="spec-value">NVIDIA RTX 3060 6GB</div>
        </div>
        <div class="spec-row">
            <div class="spec-name">סוללה</div>
            <div class="spec-value">4-Cell 70Wh</div>
        </div>
        <div class="spec-row">
            <div class="spec-name">מערכת הפעלה</div>
            <div class="spec-value">Windows 11 Home</div>
        </div>
        <div class="spec-row">
            <div class="spec-name">משקל</div>
            <div class="spec-value">2.1 ק"ג</div>
        </div>
    </div>
</div>
            `);
        });
}

/**
 * פורמט מחיר לתצוגה
 */
function formatPrice(amount, currency = '₪') {
    const n = Number(amount);
    if (Number.isNaN(n)) return '';
    return `${currency}${n.toLocaleString('he-IL')}`;
}

/**
 * מעדכן את פרטי המוצר בדף
 */
function updateProductDetails(config) {
    // עדכון שם המוצר
    if (config.productName) {
        const productTitleElements = document.querySelectorAll('.product-title');
        productTitleElements.forEach(el => {
            el.textContent = config.productName;
        });
        document.querySelectorAll('.vp-title').forEach(el => {
            const parts = String(config.productName).split(/\s*-\s*/);
            if (parts.length > 1) {
                el.innerHTML = `${parts[0]}<span>${parts.slice(1).join(' - ')}</span>`;
            } else {
                el.innerHTML = `${config.productName}<span></span>`;
            }
        });
        document.title = `${config.productName} | VIPO`;
    }
    
    // עדכון תיאור המוצר
    if (config.productDescription) {
        const productDescElements = document.querySelectorAll('.product-description');
        productDescElements.forEach(el => {
            el.textContent = config.productDescription;
        });
    }
    
    // עדכון מחירים
    const currency = config.currency || '₪';
    if (config.price != null) {
        const formatted = formatPrice(config.price, currency);
        document.querySelectorAll('.original-price, .vp-price-was, .vp-sticky-was, .s7-was').forEach(el => {
            el.textContent = formatted;
        });
        document.querySelectorAll('.sticky-cta-price .was').forEach(el => {
            el.textContent = formatted;
        });
    }

    if (config.discountPrice != null) {
        const formatted = formatPrice(config.discountPrice, currency);
        document.querySelectorAll('.current-price, .vp-price-now, .vp-sticky-now, .s7-now').forEach(el => {
            el.textContent = formatted;
        });
        document.querySelectorAll('.sticky-cta-price .now').forEach(el => {
            el.textContent = formatted;
        });
        document.querySelectorAll('.urgency-price-now').forEach(el => {
            el.textContent = formatted;
        });
    }

    if (config.price != null && config.discountPrice != null) {
        const savings = Number(config.price) - Number(config.discountPrice);
        if (savings > 0) {
            document.querySelectorAll('.discount-badge').forEach(el => {
                el.textContent = `−${formatPrice(savings, currency)}`;
            });
            const pct = Math.round((savings / Number(config.price)) * 100);
            document.querySelectorAll('.vp-badge-save').forEach(el => {
                el.textContent = `${pct}% הנחה`;
            });
        }
    }

    if (config.priceAfterArrival != null) {
        const after = formatPrice(config.priceAfterArrival, currency);
        document.querySelectorAll('.lp-price-note strong, .urgency-price-after, .vp-price-note strong').forEach(el => {
            el.textContent = after;
        });
    }

    const delivery = config.delivery || {};
    const originName = (delivery.origin && delivery.origin.name) || 'באר יעקב';
    const shipBase = delivery.basePrice != null ? Number(delivery.basePrice) : 400;
    const shipKm = delivery.includedKm != null ? Number(delivery.includedKm) : 40;
    const shipExtra = delivery.extraPer10Km != null ? Number(delivery.extraPer10Km) : 50;
    const shipEl = document.getElementById('vpShip');
    if (shipEl) {
        shipEl.innerHTML = 'משלוח <strong>' + formatPrice(shipBase, currency) + '</strong> עד ' + shipKm + ' ק״מ מ' + originName;
    }
    const shipExtraEl = document.getElementById('vpShipExtra');
    if (shipExtraEl) {
        shipExtraEl.textContent = 'מעבר לזה +' + formatPrice(shipExtra, currency) + ' לכל 10 ק״מ · אחריות שנה';
    }


    // עדכון מלאי / FOMO
    if (typeof StockApi !== 'undefined') {
        StockApi.init(config, updateStockFomo);
    } else if (typeof StockLive !== 'undefined') {
        StockLive.init(config, updateStockFomo);
    } else if (config.totalUnits != null && config.soldUnits != null) {
        updateStockFomo(config.totalUnits, config.soldUnits);
    } else if (config.participants) {
        const participantsElements = document.querySelectorAll('.participants-count span');
        participantsElements.forEach(el => {
            el.textContent = `${config.participants} אנשים כבר רכשו`;
        });
    }
    
    // עדכון תאריך סיום
    if (config.endDate) {
        // עדכון שעון ספירה לאחור
        updateCountdown(config.endDate);
    }
    
    // עדכון מספר טלפון לוואטסאפ
    if (config.contactPhone) {
        let phone = config.contactPhone.replace(/^\+?972|^0/, '');
        const waBase = `https://wa.me/972${phone}`;
        document.querySelectorAll('.whatsapp-float a, .vp-header a[href*="wa.me"], .vp-ft-list a[href*="wa.me"]').forEach(el => {
            el.href = waBase;
        });
        document.querySelectorAll('.vp-ft-list a[href^="tel:"]').forEach(el => {
            el.href = `tel:+972${phone}`;
            el.innerHTML = el.innerHTML.replace(/[\d\-]+/, '0' + phone);
        });
    }
}

/**
 * מעדכן את בלוק המלאי / FOMO
 */
function updateStockFomo(totalUnits, soldUnits) {
    const remaining = Math.max(0, totalUnits - soldUnits);
    const pct = totalUnits > 0 ? (soldUnits / totalUnits) * 100 : 0;

    document.querySelectorAll('.stock-sold-count').forEach(el => {
        el.textContent = soldUnits;
    });
    document.querySelectorAll('.stock-left-count').forEach(el => {
        el.textContent = remaining;
    });
    document.querySelectorAll('.stock-total-count').forEach(el => {
        el.textContent = totalUnits;
    });

    const bar = document.getElementById('stockBar');
    if (bar) {
        bar.style.width = `${pct.toFixed(1)}%`;
    }

    document.querySelectorAll('.s2-progress-fill').forEach(el => {
        el.style.width = `${pct.toFixed(1)}%`;
    });
}

window.updateStockFomo = updateStockFomo;

/**
 * מעדכן את שעון הספירה לאחור
 */
function updateCountdown(endDate) {
    const countdownElement = document.querySelector('.countdown');
    if (!countdownElement) return;
    
    const endDateTime = new Date(endDate).getTime();
    
    // עדכון הספירה לאחור כל שנייה
    const countdownInterval = setInterval(function() {
        const now = new Date().getTime();
        const distance = endDateTime - now;
        
        // חישוב זמן
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        
        // עדכון התצוגה
        countdownElement.innerHTML = `
            <div class="countdown-item">
                <div class="countdown-value">${days}</div>
                <div class="countdown-label">ימים</div>
            </div>
            <div class="countdown-item">
                <div class="countdown-value">${hours}</div>
                <div class="countdown-label">שעות</div>
            </div>
            <div class="countdown-item">
                <div class="countdown-value">${minutes}</div>
                <div class="countdown-label">דקות</div>
            </div>
            <div class="countdown-item">
                <div class="countdown-value">${seconds}</div>
                <div class="countdown-label">שניות</div>
            </div>
        `;
        
        // אם הספירה לאחור הסתיימה
        if (distance < 0) {
            clearInterval(countdownInterval);
            countdownElement.innerHTML = '<div class="countdown-ended">הקבוצה נסגרה</div>';
        }
    }, 1000);
}
