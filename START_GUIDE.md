# 🚀 دليل تشغيل Clinics Pro - نظام حجز مواعيد العيادات

## ✅ ما تم إنجازه:

- ✅ تثبيت Git
- ✅ تثبيت جميع المكتبات (`npm install`)
- ✅ إنشاء Prisma Client
- ✅ إنشاء ملف `.env`

---

## 📋 الخطوات المتبقية:

### الخطوة 1: إعداد قاعدة البيانات

**الخيار الأسهل: استخدام Supabase (مجاني)**

1. اذهب إلى: https://supabase.com
2. سجل حساب جديد
3. أنشئ مشروع جديد
4. انسخ `Connection String` من Settings → Database
5. افتح ملف `.env` واستبدل `DATABASE_URL` بالرابط الذي نسخته

**أو استخدم PostgreSQL محلي:**
```powershell
winget install --id PostgreSQL.PostgreSQL
```

### الخطوة 2: تشغيل Database Migrations

```powershell
cd "C:\Users\power\Desktop\step"
npm run prisma:migrate
```

هذا سوف ينشئ جميع الجداول اللازمة.

---

## 🎯 تشغيل المشروع

### 1. تشغيل Backend (API Server)

```powershell
cd "C:\Users\power\Desktop\step"
npm run dev
```

سوف يعمل على: http://localhost:4000

### 2. تشغيل Frontend (لوحة التحكم)

**في نافذة PowerShell جديدة:**

```powershell
cd "C:\Users\power\Desktop\step\frontend"
npm install
cp .env.example .env
npm run dev
```

سوف تفتح على: http://localhost:5173

---

## 📱 كيفية ربط عيادة بـ WhatsApp

### من لوحة التحكم (Frontend):

1. افتح http://localhost:5173
2. اضغط "Add Clinic" وأدخل بيانات العيادة
3. اضغط "Connect WhatsApp"
4. سوف يظهر QR Code
5. افتح WhatsApp على هاتفك
6. اذهب إلى: الإعدادات → الأجهزة المرتبطة → ربط جهاز
7. امسح الـ QR Code
8. سوف يتصل تلقائياً ✅

---

## 📊 ميزات النظام

### 1. حجز المواعيد عبر WhatsApp
- المرضى يرسلون رسالة للعيادة
- البوت يرد تلقائياً ويعرض المواعيد المتاحة
- يحجز الموعد ويرسل تأكيد

### 2. التذكيرات التلقائية
- تذكير قبل الموعد بـ 2 ساعة
- المريض يمكنه التأكيد (1) أو الإلغاء (2)

### 3. قائمة الانتظار
- إذا كان الموعد محجوز، المريض يدخل قائمة الانتظار
- عند الإلغاء، يتم إشعار التالي في القائمة

### 4. لوحة التحكم
- عرض جميع المواعيد
- إحصائيات الحضور والغياب
- تقارير مالية
- إدارة ساعات العمل

---

## 🔧 استكشاف الأخطاء

### المشكلة: "Cannot connect to database"
**الحل:** تأكد من:
- رابط `DATABASE_URL` صحيح في `.env`
- قاعدة البيانات تعمل
- جرب: `npm run prisma:migrate`

### المشكلة: "Port 4000 is already in use"
**الحل:** غيّر `PORT` في ملف `.env` إلى رقم آخر (مثل 4001)

### المشكلة: "WhatsApp not connecting"
**الحل:** 
- تأكد من امسح QR Code خلال دقيقة
- تأكد من اتصال الإنترنت
- جرب مرة أخرى

---

## 📁 الملفات المهمة

| الملف | الوصف |
|-------|--------|
| `.env` | إعدادات المشروع (قاعدة البيانات، PORT، إلخ) |
| `src/server.js` | نقطة بداية Backend |
| `frontend/` | لوحة التحكم (React + Vite) |
| `prisma/schema.prisma` | هيكل قاعدة البيانات |
| `sessions/` | بيانات اتصال WhatsApp (تُنشأ تلقائياً) |

---

## 🎉 بعد التشغيل الناجح

1. ✅ Backend يعمل على http://localhost:4000
2. ✅ Frontend يعمل على http://localhost:5173
3. ✅ قاعدة البيانات متصلة
4. ✅ جاهز لربط العيادات بـ WhatsApp

---

## 📞 الخطوات التالية

1. أكمل إعداد قاعدة البيانات (الخطوة 1)
2. شغّل Migrations (الخطوة 2)
3. شغّل Backend و Frontend
4. ابدأ بإضافة العيادات وربطها بـ WhatsApp

**بالتوفيق! 🚀**
