# 🎯 الخطوات القادمة بعد تثبيت PostgreSQL

## ✅ ما تم حتى الآن:
- ✅ تثبيت Git
- ✅ تثبيت المكتبات (npm install)
- ✅ إنشاء Prisma Client
- ✅ إنشاء ملف .env
- ⏳ **جاري تثبيت PostgreSQL...**

---

## 📋 بعد انتهاء التثبيت:

### الخطوة 1: إنشاء قاعدة البيانات

افتح **Command Prompt** أو **PowerShell** وشغل:

```powershell
# تسجيل دخول PostgreSQL (كلمة المرور اللي اخترتها وقت التثبيت)
psql -U postgres

# إنشاء قاعدة البيانات
CREATE DATABASE clinic_whatsapp;

# الخروج
\q
```

### الخطوة 2: تحديث ملف .env

افتح ملف `.env` في مجلد step وعدّل السطر ده:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/clinic_whatsapp?schema=public"
```

استبدل `YOUR_PASSWORD` بكلمة المرور اللي اخترتها وقت تثبيت PostgreSQL.

### الخطوة 3: تشغيل Database Migrations

في مجلد المشروع:

```powershell
cd "C:\Users\power\Desktop\step"
npm run prisma:migrate
```

### الخطوة 4: تشغيل Backend

```powershell
npm run dev
```

سوف يعمل على: http://localhost:4000

### الخطوة 5: تشغيل Frontend

في نافذة PowerShell جديدة:

```powershell
cd "C:\Users\power\Desktop\step\frontend"
npm install
npm run dev
```

سوف يعمل على: http://localhost:5173

---

## 🚀 بعدها المشروع يكون جاهز للاستخدام!

✅ يمكنك إضافة عيادات
✅ ربطها بـ WhatsApp
✅ البدء في استقبال حجوزات من المرضى

---

## 💡 إذا واجهت مشاكل:

### مشكلة: psql غير موجود
**الحل:** أعد تشغيل PowerShell أو الكمبيوتر بعد التثبيت

### مشكلة: Cannot connect to database
**الحل:** تأكد أن PostgreSQL يعمل:
```powershell
Get-Service postgresql*
```

### مشكلة: Port already in use
**الحل:** غيّر PORT في .env إلى رقم آخر (مثل 4001)

---

**ملاحظة:** التثبيت قد يأخذ 5-10 دقائق حسب سرعة الجهاز 🕐
