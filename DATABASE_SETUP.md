# إعداد قاعدة البيانات - Clinics Pro

## الخيار 1: استخدام Supabase (موصى به - مجاني)

### الخطوات:

1. **إنشاء حساب Supabase**
   - اذهب إلى: https://supabase.com
   - سجل حساب جديد (مجاني)

2. **إنشاء مشروع جديد**
   - اضغط "New Project"
   - اختر اسم للمشروع: `clinics-pro`
   - اختار كلمة مرور قوية للقاعدة
   - اختر المنطقة القريبة منك

3. **الحصول على رابط الاتصال**
   - اذهب إلى: Settings → Database
   - انسخ `Connection String` (URI)
   - استبدل `[YOUR-PASSWORD]` بكلمة المرور

4. **تحديث ملف .env**
   - افتح ملف `.env` في المشروع
   - استبدل السطر:
   ```
   DATABASE_URL="postgresql://postgres:password@localhost:5432/clinic_whatsapp?schema=public"
   ```
   بالرابط الذي نسخته من Supabase

---

## الخيار 2: تثبيت PostgreSQL محلياً

### على Windows:

1. **تحميل PostgreSQL**
   ```powershell
   winget install --id PostgreSQL.PostgreSQL
   ```

2. **إنشاء قاعدة البيانات**
   ```powershell
   psql -U postgres
   CREATE DATABASE clinic_whatsapp;
   \q
   ```

3. **تحديث .env**
   ```
   DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/clinic_whatsapp?schema=public"
   ```

---

## بعد إعداد قاعدة البيانات

### تشغيل Migrations:

```powershell
npm run prisma:migrate
```

هذا سوف ينشئ الجداول اللازمة في قاعدة البيانات.

---

## اختبار الاتصال

```powershell
npx prisma studio
```

سوف يفتح واجهة ويب لإدارة قاعدة البيانات.
