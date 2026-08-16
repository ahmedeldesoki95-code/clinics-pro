# 🚀 نشر Clinics Pro على Render.com (مجاني 100%)

## الخطوات بالتفصيل:

---

### الخطوة 1: رفع الكود على GitHub

#### 1. افتح PowerShell في مجلد المشروع:
```powershell
cd "C:\Users\power\Desktop\step"
```

#### 2. ابدأ Git:
```powershell
git init
git add .
git commit -m "Initial commit - Clinics Pro"
```

#### 3. أنشئ Repository على GitHub:
- اذهب إلى: https://github.com/new
- اسم الـ Repo: `clinics-pro`
- اجعله **Private** (خاص)
- اضغط **"Create repository"**

#### 4. اربط المشروع بـ GitHub:
```powershell
# استبدل YOUR_USERNAME باسم المستخدم الخاص بك
git remote add origin https://github.com/YOUR_USERNAME/clinics-pro.git
git branch -M main
git push -u origin main
```

---

### الخطوة 2: النشر على Render

#### 1. اذهب إلى Render:
🔗 **https://render.com**

#### 2. سجل حساب:
- استخدم حساب GitHub للتسجيل (أسهل)

#### 3. أنشئ قاعدة البيانات أولاً:
- اضغط **"New +"** من الأعلى
- اختر **"PostgreSQL"**
- **Name**: `clinics-db`
- **Database**: `clinic_whatsapp`
- **User**: `clinic_user`
- **Region**: اختر الأقرب لك (Frankfurt لمصر)
- **Plan**: اختر **"Free"** (مجاني)
- اضغط **"Create Database"**

#### 4. انتظر حتى تكتمل (1-2 دقيقة)

#### 5. انسخ رابط قاعدة البيانات:
- في صفحة قاعدة البيانات
- ابحث عن **"Internal Database URL"**
- اضغط **"Copy"** وخزنه في ملف نصي

#### 6. أنشئ Backend Service:
- اضغط **"New +"** من الأعلى
- اختر **"Web Service"**
- اضغط **"Build and deploy from a Git repository"**
- اضغط **"Next"**

#### 7. اختر Repository:
- اختر **"Connect account"** إذا لم تكن قد ربطت GitHub
- اختر repository: `clinics-pro`
- اضغط **"Connect"**

#### 8. املأ البيانات:
- **Name**: `clinics-pro-backend`
- **Region**: نفس منطقة قاعدة البيانات
- **Branch**: `main`
- **Root Directory**: (اتركه فاضي)
- **Runtime**: `Node`
- **Build Command**: `npm install && npx prisma generate && npx prisma migrate deploy`
- **Start Command**: `npm start`
- **Plan**: اختر **"Free"** (مجاني)

#### 9. أضف Environment Variables:
اضغط **"Add Environment Variable"** وأضف:

```
NODE_ENV = production
PORT = 10000
DATABASE_URL = [الصق الرابط اللي نسخته من الخطوة 5]
REMINDER_CRON = */10 * * * *
REMINDER_WINDOW_HOURS = 2
MIN_SEND_DELAY_MS = 2000
MAX_SEND_DELAY_MS = 5000
SESSIONS_DIR = ./sessions
```

#### 10. اضغط **"Create Web Service"**

#### 11. انتظر حتى ينتهي النشر (5-10 دقائق)

---

### الخطوة 3: نشر Frontend

#### 1. عدل ملف Frontend `.env`:
في مجلد `frontend`، افتح `.env` وعدله:

```env
VITE_API_BASE_URL=https://clinics-pro-backend.onrender.com/api
```

(استبدل `clinics-pro-backend` باسم الـ service اللي أنشأته)

#### 2. ارفع التعديل على GitHub:
```powershell
cd "C:\Users\power\Desktop\step"
git add .
git commit -m "Update frontend API URL"
git push
```

#### 3. أنشئ Frontend Service على Render:
- اضغط **"New +"** من الأعلى
- اختر **"Static Site"**
- اختر نفس repository: `clinics-pro`
- اضغط **"Connect"**

#### 4. املأ البيانات:
- **Name**: `clinics-pro-frontend`
- **Branch**: `main`
- **Root Directory**: `frontend`
- **Build Command**: `npm install && npm run build`
- **Publish Directory**: `dist`

#### 5. أضف Environment Variables:
```
VITE_API_BASE_URL = https://clinics-pro-backend.onrender.com/api
```

#### 6. اضغط **"Create Static Site"**

---

### الخطوة 4: جاهز! 🎉

#### الروابط النهائية:

**لوحة التحكم (Frontend):**
```
https://clinics-pro-frontend.onrender.com
```

**API (Backend):**
```
https://clinics-pro-backend.onrender.com
```

---

## 📱 ربط WhatsApp:

⚠️ **مهم جداً:**

WhatsApp يحتاج اتصال دائم. على Render المجاني، الخدمة **تنام** بعد 15 دقيقة من عدم الاستخدام.

### الحل:

#### الخيار 1: Uptime Robot (مجاني)
- اذهب إلى: https://uptimerobot.com
- سجل حساب
- أضف Monitor:
  - **Type**: HTTP(s)
  - **URL**: `https://clinics-pro-backend.onrender.com`
  - **Interval**: كل 5 دقائق
- هذا سيبقي السيرفر مستيقظاً ✅

#### الخيار 2: Cron-job.org (مجاني)
- اذهب إلى: https://cron-job.org
- سجل حساب
- أضف Cron Job:
  - **URL**: `https://clinics-pro-backend.onrender.com`
  - **Interval**: كل 5 دقائق

#### الخيار 3: الترقية لـ Paid Plan ($7/شهر)
- السيرفر لا ينام أبداً
- أسرع بكثير
- موثوق أكثر

---

## 🎯 الاستخدام:

### للسكرتيرة/الدكتور:
افتح الرابط:
```
https://clinics-pro-frontend.onrender.com
```

كل شيء يعمل تلقائياً! 🎉

---

## ⚠️ ملاحظات مهمة:

### 1. السرعة:
الخطة المجانية **بطيئة قليلاً** (خاصة أول طلب بعد النوم).

### 2. النوم:
الخدمة تنام بعد 15 دقيقة. استخدم Uptime Robot لمنع ذلك.

### 3. القيود:
- **750 ساعة/شهر** من وقت التشغيل (كافية إذا استخدمت Uptime Robot بذكاء)
- **100 GB Bandwidth/شهر** (كافية جداً)

### 4. الترقية:
إذا احتجت أداء أفضل:
- **$7/شهر** لـ Starter Plan
- سيرفر لا ينام
- أسرع 10 مرات

---

## 🆘 حل المشاكل:

### المشكلة: Build فشل
**الحل:**
- تأكد من رفع كل الملفات على GitHub
- تأكد من صحة `package.json`

### المشكلة: Database connection failed
**الحل:**
- تأكد من نسخ `DATABASE_URL` الصحيح
- تأكد من وجود `Internal Database URL` (ليس External)

### المشكلة: Frontend لا يتصل بـ Backend
**الحل:**
- تأكد من `VITE_API_BASE_URL` صحيح
- تأكد من السيرفر يعمل (افتح رابط Backend في المتصفح)

---

## 💰 التكلفة:

### مجاني 100%:
- ✅ Backend
- ✅ Frontend  
- ✅ PostgreSQL Database
- ✅ Domain من Render (.onrender.com)

### إذا أردت domain خاص:
- اشترِ domain (مثل: clinic.com) من Namecheap ($10/سنة)
- اربطه بـ Render (مجاني)

---

**بالتوفيق! 🚀**
