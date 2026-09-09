תיקיות תמונות וסרטונים — מסלול המכולה
======================================

תמונות: WebP ישירות בתיקיית השלב (01-production וכו').
אם יש jpg/png — הרץ: python setup/convert-shipment-to-webp.py

סרטונים: MP4 בתת-תיקייה videos/ של כל שלב.
  לדוגמה: assets/shipment/01-production/videos/factory-line-01.mp4

01-production   = ייצור במפעל (קו ייצור, QC, אריזה)
02-loading      = העמסה למכולה (סגירה, מספר מכולה)
03-shipped      = נשלח מהמפעל
04-israel-port  = הגיע לנמל בישראל

(אין שלבים: נמל סין / אוניה בדרך — אין תמונות)

אחרי העלאת קבצים חדשים:
  python setup/build-shipment-manifest.py

טיפ: שמות קבצים באנגלית בלי רווחים (למשל factory-line-01.webp)
