# 🚀 دليل نشر النظام عند الدكتور

## 📋 الخيارات المتاحة:

---

## **الخيار 1: تشغيل محلي + Ngrok (موصى به للبداية)** ⭐

### المميزات:
- ✅ مجاني تماماً
- ✅ سهل التركيب
- ✅ يعمل من أي مكان
- ✅ البيانات عند الدكتور

### الخطوات:

#### 1. تشغيل النظام على الكمبيوتر:

**في PowerShell - نافذة 1 (Backend):**
```powershell
cd "C:\Users\power\Desktop\step"
$env:PATH += ";C:\Program Files\PostgreSQL\17\bin"
npm start
```

**في PowerShell - نافذة 2 (Frontend):**
```powershell
cd "C:\Users\power\Desktop\step\frontend"
npm run dev
```

#### 2. فتح الوصول للإنترنت باستخدام Ngrok:

**في PowerShell - نافذة 3:**
```powershell
# للـ Frontend (لوحة التحكم)
ngrok http 5173

# سوف يعطيك رابط مثل:
# https://abc123.ngrok.io
```

**في PowerShell - نافذة 4 (اختياري - للـ API):**
```powershell
ngrok http 4000
```

#### 3. مشاركة الرابط:

أعطي الدكتور/السكرتيرة الرابط الذي ظهر:
```
https://abc123.ngrok.io
```

---

## **الخيار 2: تشغيل محلي فقط (داخل العيادة)**

### للوصول من أجهزة في نفس الشبكة:

#### 1. معرفة IP الكمبيوتر:

```powershell
ipconfig
# ابحث عن IPv4 Address (مثال: 192.168.1.100)
```

#### 2. فتح Firewall:

```powershell
# السماح للمنفذ 5173
New-NetFirewallRule -DisplayName "Clinics Pro Frontend" -Direction Inbound -LocalPort 5173 -Protocol TCP -Action Allow

# السماح للمنفذ 4000
New-NetFirewallRule -DisplayName "Clinics Pro Backend" -Direction Inbound -LocalPort 4000 -Protocol TCP -Action Allow
```

#### 3. تعديل Frontend للاتصال بـ IP المحلي:

افتح ملف `frontend\.env` وعدله:
```env
VITE_API_BASE_URL=http://192.168.1.100:4000/api
```

#### 4. شغّل Frontend بـ host:

```powershell
cd frontend
npm run dev -- --host
```

#### 5. الوصول من أي جهاز في الشبكة:

```
http://192.168.1.100:5173
```

---

## **الخيار 3: نشر على سيرفر سحابي** ☁️

### خدمات موصى بها:

#### A) Railway.app (الأسهل - مجاني):

1. اذهب إلى: https://railway.app
2. سجل حساب
3. اضغط "New Project"
4. اختر "Deploy from GitHub"
5. ارفع الكود على GitHub
6. Railway سوف ينشر تلقائياً

#### B) DigitalOcean (احترافي - $6/شهر):

1. إنشاء Droplet (Ubuntu)
2. تثبيت Node.js + PostgreSQL
3. نقل الملفات عبر Git
4. تشغيل بـ PM2

```bash
npm install -g pm2
pm2 start src/server.js
pm2 startup
pm2 save
```

#### C) Heroku (سهل - $7/شهر):

```bash
heroku create clinic-dr-maher
heroku addons:create heroku-postgresql
git push heroku main
```

---

## 👥 الوصول للسكرتيرة/الدكتور:

### لوحة التحكم:

**الرابط:** (حسب الخيار اللي اخترته):
- محلي: `http://192.168.1.100:5173`
- Ngrok: `https://abc123.ngrok.io`
- سحابي: `https://clinic.yourdomain.com`

### الصفحات المتاحة:

1. **🏠 Dashboard** - الصفحة الرئيسية
   - عدد المواعيد
   - الإحصائيات السريعة
   - حالة WhatsApp

2. **📅 Schedule** - إدارة المواعيد
   - عرض المواعيد (يوم/أسبوع/شهر)
   - تأكيد/إلغاء/تعديل
   - إضافة موعد يدوياً

3. **⏰ Waitlist** - قائمة الانتظار
   - عرض المنتظرين
   - إضافة/حذف

4. **📊 Analytics** - التقارير
   - معدلات الحضور
   - الإيرادات
   - أوقات الذروة

---

## 🔐 إضافة نظام Login (اختياري):

حالياً النظام مفتوح بدون login. لو تريد حماية:

### حل بسيط - كلمة مرور واحدة:

1. افتح `frontend/src/App.jsx`
2. أضف في البداية:

```javascript
const [isLoggedIn, setIsLoggedIn] = useState(false);
const [password, setPassword] = useState('');

if (!isLoggedIn) {
  return (
    <div style={{padding: '50px', textAlign: 'center'}}>
      <h2>تسجيل الدخول</h2>
      <input 
        type="password" 
        placeholder="كلمة المرور"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button onClick={() => {
        if (password === 'clinic123') {
          setIsLoggedIn(true);
        } else {
          alert('كلمة مرور خاطئة');
        }
      }}>
        دخول
      </button>
    </div>
  );
}
```

---

## 📱 تشغيل تلقائي عند بدء Windows:

### إنشاء Batch File:

1. أنشئ ملف `start_clinic_system.bat` في Desktop:

```batch
@echo off
start "Backend" cmd /k "cd C:\Users\power\Desktop\step && set PATH=%PATH%;C:\Program Files\PostgreSQL\17\bin && npm start"
start "Frontend" cmd /k "cd C:\Users\power\Desktop\step\frontend && npm run dev"
timeout /t 10
start "" "http://localhost:5173"
```

2. اضغط عليه مرتين للتشغيل

3. لتشغيل تلقائي عند بدء Windows:
   - اضغط `Win + R`
   - اكتب: `shell:startup`
   - اضغط Enter
   - ضع الملف `.bat` هناك

---

## ⚠️ ملاحظات مهمة:

### للتشغيل الدائم:

1. **الكمبيوتر لازم يكون شغال دايماً**
   - عطّل Sleep Mode:
     ```
     Settings → System → Power & sleep → Never
     ```

2. **PostgreSQL يشتغل تلقائياً**
   ```powershell
   Set-Service -Name postgresql-x64-17 -StartupType Automatic
   ```

3. **نسخ احتياطي يومي**
   ```powershell
   # ضع في Task Scheduler
   pg_dump -U postgres clinic_whatsapp > backup_%date%.sql
   ```

---

## 🆘 استكشاف الأخطاء:

### المشكلة: "Cannot connect to API"
**الحل:** 
- تأكد Backend يعمل (port 4000)
- تأكد من `VITE_API_BASE_URL` في `.env`

### المشكلة: "WhatsApp disconnected"
**الحل:**
- افتح Dashboard
- اضغط "Connect WhatsApp"
- امسح QR Code مرة أخرى

### المشكلة: Ngrok انقطع
**الحل:**
- Ngrok المجاني ينقطع بعد 8 ساعات
- شغله مرة أخرى
- أو استخدم حساب Ngrok مدفوع ($8/شهر) للروابط الثابتة

---

## 💡 نصائح:

1. **استخدم UPS** للحماية من انقطاع الكهرباء
2. **نسخ احتياطي يومي** من قاعدة البيانات
3. **اختبر النظام** قبل البدء الفعلي
4. **درّب السكرتيرة** على استخدام اللوحة

---

**أي استفسار، أنا هنا! 🚀**
