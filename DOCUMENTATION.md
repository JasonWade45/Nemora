# PharmaTrack - نظام CRM لإدارة فرق المبيعات الميدانية في الصيدلية

## نظرة عامة على المشروع

**PharmaTrack** هو نظام SaaS متكامل لإدارة فرق المبيعات الميدانية في شركات الأدوية والصيدلية. يوفر النظام أدوات شاملة لإدارة المندوبينMedical Reps)، الأطباء، الزيارات الميدانية، التتبع بال GPS، التقارير، والأهداف الشهرية. مصمم بالكامل باللغة العربية مع واجهة RTL (من اليمين لليسار) ويدعم الوضع الداكن والفاتح.

### المعلومات الأساسية
- **الإصدار**: 0.1.0 (MVP)
- **تاريخ الإنشاء**: سبتمبر 2026
- **الموقع**: `http://localhost:3000`
- **قاعدة البيانات**: SQLite (قابل للتحويل إلى PostgreSQL/Supabase)

---

## البطاقات和技术栈 (Tech Stack)

### الواجهة الأمامية (Frontend)
| التقنية | الإصدار | الوظيفة |
|---------|---------|---------|
| **Next.js** | 16.3.5 | إطار العمل الرئيسي (App Router) |
| **React** | 19.2.8 | مكتبة الواجهات |
| **TypeScript** | ^5 | اللغة البرمجية |
| **Tailwind CSS** | ^4 | نظام التصميم |
| **Lucide React** | ^1.46.0 | الأيقونات |

### الخلفية (Backend)
| التقنية | الوظيفة |
|---------|---------|
| **Prisma** | ORM لإدارة قاعدة البيانات |
| **SQLite** | قاعدة البيانات (_dev.db) |
| **NextAuth.js** | نظام المصادقة (Authentication) |
| **bcryptjs** | تشفير كلمات المرور |

### المكونات الإضافية
| المكتبة | الوظيفة |
|---------|---------|
| **Leaflet + React-Leaflet** | الخرائط التفاعلية (OpenStreetMap) |
| **Recharts** | الرسوم البيانية |
| **next-themes** | الوضع الداكن/الفاتح |
| **xlsx** | استيراد/تصدير Excel |
| **file-saver** | تحميل الملفات |

---

## الهيكل العام للمشروع (Project Structure)

```
pharma-crm/
├── prisma/
│   ├── schema.prisma          # مخطط قاعدة البيانات (12 نموذج)
│   ├── seed.ts                # بيانات تجريبية (داتا Alexandria, Egypt)
│   └── dev.db                 # قاعدة البيانات SQLite
├── src/
│   ├── app/                   # صفحات التطبيق (App Router)
│   │   ├── (auth)/            # مجموعة المسارات: صفحة الدخول
│   │   ├── admin/             # لوحة تحكم الادمن
│   │   ├── manager/           # لوحة تحكم المدير
│   │   ├── rep/               # تطبيق المندوب
│   │   └── api/               # API Routes (21 مسار)
│   ├── components/            # المكونات المشتركة
│   │   ├── ui/                # مكونات الواجهة الأساسية
│   │   ├── layout/            # مكونات التخطيط
│   │   └── map-view.tsx       # مكون الخريطة
│   ├── lib/                   # الملفات المساعدة
│   │   ├── auth.ts            # اعدادات NextAuth
│   │   ├── auth-context.tsx   # سياق المصادقة
│   │   ├── prisma.ts          # اتصال قاعدة البيانات
│   │   ├── geo.ts             # أدوات الموقع الجغرافي
│   │   ├── use-translations.ts # الترجمة
│   │   └── locale-context.ts  # سياق اللغة
│   └── styles/
│       └── globals.css        # الأنماط العامة
├── .env                       # متغيرات البيئة
├── package.json               # التبعيات
└── tailwind.config.ts         # اعدادات Tailwind
```

---

## مخطط قاعدة البيانات (Database Schema)

### النماذج (12 Model)

#### 1. Company (الشركة)
```
- id, name, slug, logo, settings
- subscription (BASIC | PROFESSIONAL | ENTERPRISE)
- users[], doctors[], products[], visits[], targets[]
```

#### 2. User (المستخدم / المندوب / المدير)
```
- id, email, password (مشفرة بـ bcrypt)
- name, phone, employeeId, jobTitle
- role (ADMIN | MANAGER | MEDICAL_REP)
- isActive, profileImage
- companyId, managerId (شجرة الادارة)
- workingDays, workingHours (ايام وساعات العمل)
```

#### 3. Doctor (الطبيب)
```
- id, name, phone, email
- specialtyId, subSpecialty, gender
- clinicName, address, governorate, city
- latitude, longitude (الموقع على الخريطة)
- priority (A | B | C) - أولوية الزيارة
- companyId
```

#### 4. Visit (الزيارة)
```
- id, repId, doctorId
- visitPurpose (DETAILING | FOLLOW_UP | PRODUCT_LAUNCH | SAMPLE_DELIVERY | MEDICAL_EDUCATION)
- status (IN_PROGRESS | COMPLETED | CANCELLED)
- startTime, endTime, duration (بالدقائق)
- latitude, longitude, distanceFromDoctor
- isVerified (هل تم التحقق بال GPS)
- doctorResponse (VERY_INTERESTED | INTERESTED | NEUTRAL | NOT_INTERESTED)
- notes, nextFollowUpDate
```

#### 5. Target (الهدف)
```
- id, repId, month, year
- totalVisits, totalDoctors, newDoctors, followUps
- (فريد لكل مندوب/شهر/سنة)
```

#### 6. FollowUp (المتابعة)
```
- id, repId, doctorId, visitId
- dueDate, actionType (CALL | VISIT | SEND_INFO)
- status (PENDING | COMPLETED | MISSED)
```

#### 7. Product (المنتج)
```
- id, name, genericName, category
- description, dosageInfo, companyId
```

#### 8. Notification (الاشعار)
```
- id, userId, title, message
- type (VISIT | FOLLOW_UP | TARGET | SYSTEM | ASSIGNMENT)
- isRead, createdAt
```

#### 9. Specialty (التخصص الطبي)
#### 10. DoctorSchedule (مواعيد العمل)
#### 11. DoctorLocation (مواقع العيادة)
#### 12. AuditLog (سجل التدقيق)
#### 13. Subscription (الاشتراك)

---

## واجهات المستخدم (User Interfaces)

### 1. صفحة الدخول (`/login`)
- تصميم متدرج مع خلفية متحركة (Animated Gradient)
- بطاقات ميزات التطبيق مع تأثيرات hover
- نموذج دخول بـ Email أو Phone
- زر إظهار/إخفاء كلمة المرور
- خيار "تذكرني" ورابط "نسيت كلمة المرور"
- **بيانات الدخول التجريبية**:
  - `admin@pharmavet.com` / `password123` (مدير النظام)
  - `manager@pharmavet.com` / `password123` (مدير المبيعات)
  - `rep1@pharmavet.com` / `password123` (مندوب)
  - `rep2@pharmavet.com` / `password123` (مندوب)
  - `rep3@pharmavet.com` / `password123` (مندوب)

---

### 2. لوحة تحكم الادمن (`/admin`)

#### الداشبورد الرئيسي
- **بطاقات الإحصائيات**: اجمالي المندوبين، الاطباء، زيارات اليوم، المتابعات، تحقيق الهدف
- **رسم بياني شريطي**: الزيارات خلال الاسبوع
- **رسم بياني دائري**: تخصصات الاطباء
- **اجراءات سريعة**: اضافة موظف، دكتور، منتج، عرض التقارير، الاعدادات

#### صفحات الادمن
| الصفحة | الرابط | الوصف |
|--------|--------|-------|
| الداشبورد | `/admin` | نظرة عامة واحصائيات |
| الموظفين | `/admin/employees` | قائمة المندوبين والمديرين |
| اضافة موظف | `/admin/employees/new` | نموذج اضافة موظف جديد |
| الاطباء | `/admin/doctors` | قائمة جميع الاطباء |
| اضافة دكتور | `/admin/doctors/new` | نموذج اضافة طبيب جديد |
| استيراد اطباء | `/admin/doctors/import` | استيراد من Excel |
| المنتجات | `/admin/products` | قائمة المنتجات الصيدلانية |
| التقارير | `/admin/reports` | تقارير الزيارات والاداء |
| الاهداف | `/admin/targets` | اهداف المندوبين الشهرية |
| الاعدادات | `/admin/settings` | اعدادات النظام والشركة |

---

### 3. لوحة تحكم المدير (`/manager`)

#### الميزات الرئيسية
- **تتبع المندوبين على الخريطة مباشرة** (`/manager/map`)
- **ادارة فريق المندوبين** (`/manager/team`)
- **متابعة زيارات الفريق** (`/manager/visits`)
- **设置 ومتابعة الاهداف** (`/manager/targets`)
- **التقارير** (`/manager/reports`)

---

### 4. تطبيق المندوب (`/rep`)

#### الصفحة الرئيسية (`/rep`)
- احصائيات المندوب الشخصية (زيارات اليوم، الاطباء، المتابعات)
- بطاقات ملخصة بألوان مميزة

#### البحث عن الأطباء القريبين (`/rep/nearby`)
- **خريطة Leaflet حقيقية** مع تحميل dinamico
- **عرض الموقع الحالي** للمستخدم
- **قائمة الاطباء القريبين** مع المسافة
- **نافذة خريطة كاملة الشاشة** (`/rep/nearby/map`)

#### ادارة الأطباء (`/rep/my-doctors`)
- قائمة الأطباء المخصصين للمندوب
- تفاصيل كل طبيب مع ملف شخصي
- المتابعات المعلقة

#### بدء زيارة (`/rep/visits/start`)
- **اختيار الطبيب** من القائمة
- **التحقق من الموقع** بال GPS
- **حساب المسافة** بين المندوب والطبيب (خوارزمية Haversine)
- **الحد الاقصى 200 متر** للتحقق
- **حجب الزيارة** حتى يتم تفعيل الموقع

#### الزيارة النشطة (`/rep/visits/active`)
- **مؤقت الزيارة** (وقت البدء والنهاية)
- **تتبع الموقع** أثناء الزيارة
- **تسجيل رد الطبيب** (مهتم جداً، مهتم، محايد، غير مهتم)
- **اختيار المنتجات** المقدمة
- **ملاحظات** و**تاريخ المتابعة القادمة**

#### الجدول (`/rep/schedule`)
- مواعيد الزيارات القادمة

#### المتابعات (`/rep/follow-ups`)
- المتابعات المعلقة والمكتملة

#### الملف الشخصي (`/rep/profile`)
- معلومات المندوب واعدادات الحساب

---

## API Routes (21 مسار)

### المصادقة
| المسار | Method | الوصف |
|--------|--------|-------|
| `/api/auth/[...nextauth]` | POST/GET | NextAuth handler |
| `/api/auth/register` | POST | تسجيل مستخدم جديد |
| `/api/auth/session` | GET | جلب بيانات الجلسة |

### البيانات
| المسار | Method | الوصف |
|--------|--------|-------|
| `/api/stats` | GET | احصائيات الداشبورد |
| `/api/doctors` | GET/POST | CRUD الاطباء |
| `/api/doctors/[id]` | GET/PUT/DELETE | طبيب محدد |
| `/api/doctors/nearby` | GET | الاطباء القريبين (GPS) |
| `/api/doctors/import` | POST | استيراد من Excel |
| `/api/employees` | GET/POST | الموظفين |
| `/api/employees/[id]` | GET/PUT/DELETE | موظف محدد |
| `/api/visits` | GET | الزيارات |
| `/api/visits/start` | POST | بدء زيارة |
| `/api/visits/complete` | POST | انهاء زيارة |
| `/api/visits/[id]` | GET | زيارة محددة |
| `/api/my-doctors` | GET | اطباء المندوب |
| `/api/my-doctors/[id]` | GET | طبيب محدد للمندوب |
| `/api/targets` | GET/POST | الاهداف |
| `/api/reports` | GET | التقارير (4 انواع) |
| `/api/products` | GET/POST | المنتجات |
| `/api/products/[id]` | GET/PUT/DELETE | منتج محدد |
| `/api/follow-ups` | GET | المتابعات |
| `/api/notifications` | GET | الاشعارات |

---

## المكونات المشتركة (Shared Components)

### مكونات الواجهة (`/components/ui`)
| المكون | الوصف |
|--------|-------|
| `Button` | زر بالتدرج (primary, secondary, ghost, danger) |
| `Card` | بطاقة بظلال (elevated, flat, bordered) |
| `Input` | حقل ادخال مع label و icon |
| `Badge` | شارة ملونة (success, warning, danger, default) |
| `Avatar` | صورة المستخدم مع الأحرف الأولى |
| `Select` | قائمة منسدلة |
| `Tabs` | تبويبات |

### مكونات التخطيط (`/components/layout`)
| المكون | الوصف |
|--------|-------|
| `Sidebar` | شريط جانبي قابل للطي (Admin) |
| `Header` | رأس الصفحة |
| `BottomNav` | شريط التنقل السفلي (Rep) |
| `AuthLayout` | تخطيط صفحة الدخول |
| `AdminLayout` | تخطيط لوحة الادمن |
| `ManagerLayout` | تخطيط لوحة المدير مع شريط جانبي |
| `RepLayout` | تخطيط تطبيق المندوب مع شريط سفلي |

### مكونات مساعدة
| المكون | الوصف |
|--------|-------|
| `MapView` | خريطة Leaflet تفاعلية |
| `ThemeProvider` | مزود الوضع الداكن/الفاتح |
| `ThemeToggle` | زر تبديل الوضع |
| `LanguageToggle` | زر تبديل اللغة (عربي/انجليزي) |
| `AuthProvider` | مزود المصادقة (NextAuth) |

---

## الميزات التقنية الرئيسية

### 1. نظام المصادقة والأمان
- **NextAuth.js** مع JWT strategy
- **3 أدوار**: Admin، Manager، Medical Rep
- **تشفير كلمات المرور** بـ bcrypt
- **حماية API Routes** بـ getServerSession
- **توجيه حسب الدور** بعد تسجيل الدخول

### 2. تتبع الموقع بال GPS
- **خوارزمية Haversine** لحساب المسافة
- **الحد الاقصى 200 متر** للتحقق من الزيارة
- **حجب الزيارة** حتى يتم تفعيل الموقع
- **تتبع دوري كل 5 دقائق** للمندوبين
- ** ايقاف تلقائي** بعد انتهاء ساعات العمل

### 3. الخرائط التفاعلية
- **Leaflet + OpenStreetMap** (مجاني)
- ** Zagato circles** لتحديد نطاق 200 متر
- ** Markers** للأطباء والمندوبين
- ** Heatmap** لتتبع المندوبين (مدير)
- ** خريطة كاملة الشاشة**

### 4. التقارير والرسوم البيانية
- **4 انواع تقارير**: زيارات، اداء، اطباء، اقليمية
- **رسوم بيانية شريطية** (Bar Chart)
- **رسوم بيانية دائرية** (Pie Chart)
- **رسوم بيانية خطية** (Line Chart)
- **تصدير PDF و Excel**

### 5. الوضع الداكن/الفاتح
- **next-themes** مع تبديل سلس
- **حفظ التفضيل** في localStorage
- **تدرجات ملونة** لكل وضع

### 6. دعم RTL (من اليمين لليسار)
- **واجهة عربية بالكامل**
- **تبديل اللغة** بين العربية والانجليزية
- **تخطيط معكوس** للـ RTL

### 7. التجاوب (Responsive)
- **Mobile-first** design
- **شريط سفلي** للمندوب (5 ازرار)
- **شريط جانبي** قابل للطي للادمن والمدير
- **网格系统** متجاوب

---

## البيانات التجريبية (Seed Data)

### المستخدمين (5)
| الاسم | البريد | الدور |
|-------|--------|-------|
| احمد حسن | admin@pharmavet.com | ADMIN |
| محمد علي | manager@pharmavet.com | MANAGER |
| عمر محمود | rep1@pharmavet.com | MEDICAL_REP |
| فاطمه ابراهيم | rep2@pharmavet.com | MEDICAL_REP |
| يوسف خالد | rep3@pharmavet.com | MEDICAL_REP |

### الأطباء (73 طبيب)
- **62 طبيب** في Alexandria, Egypt (المنطقة الرئيسية)
- **6 اطباء** في Matrouh
- **5 اطباء** في Cairo

### المنتجات (8)
Cardivex, Neurozen, Pediacare, Osteovit, Gastromin, Allerfree, Glucomin, Dermaglow

### الزيارات (25)
- توزع على 3 مندوبين و10 اطباء
- تواريخ متنوعة (من 2026-09-01 الى 2026-09-15)
- اهداف شهرية لكل مندوب

---

## كيفية التشغيل

### المتطلبات
- Node.js ^18
- npm ^9

### خطوات التشغيل
```bash
# 1. تثبيت التبعيات
npm install

# 2. توليد Prisma Client
npx prisma generate

# 3. انشاء قاعدة البيانات
npx prisma db push

# 4. تعبئة البيانات التجريبية
npx tsx prisma/seed.ts

# 5. تشغيل السيرفر
npm run dev
```

### الوصول
- **التطبيق**: http://localhost:3000
- **صفحة الدخول**: http://localhost:3000/login

---

## المشاكل المعالجة (Fixed Issues)

### 1. بيانات الدخول الغلط
- **المشكلة**: صفحة الدخول كانت تعرض `admin@pharma.com` بينما البيانات في قاعدة البيانات `admin@pharmavet.com`
- **الحل**: تعديل Hint في صفحة الدخول

### 2. صفحات مفقودة
- **المشكلة**: الزراير كانت تودي صفحات 404
- **الحل**: انشاء 3 صفحات جديدة:
  - `/admin/reports` - صفحة التقارير
  - `/admin/settings` - صفحة الاعدادات
  - `/admin/targets` - صفحة الاهداف

### 3. روابط مكسورة
- **المشكلة**: AuthLayout كان بيودي `/admin/dashboard` (مش موجود)
- **الحل**: تعديل كل الروابط لـ `/admin`

### 4. تسجيل الدخول
- **المشكلة**: المستخدم مش عارف يدخل لأن البيانات غلط
- **الحل**: اصلاح البيانات + التأكد من ان NextAuth شغال

---

## الإعدادات التقنية المهمة

### Environment Variables (.env)
```
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="pharma-crm-secret-key-2024-change-in-production"
NEXTAUTH_URL="http://localhost:3000"
```

### NextAuth Configuration
- **Strategy**: JWT (فول session)
- **Max Age**: 30 يوم
- **Pages**: signIn → `/login`
- **Callbacks**: jwt + session (لإضافة role و companyId)

### Prisma Schema Notes
- **SQLite** كقاعدة بيانات (قابلة للتحويل)
- **Indexes** على الحقول الرئيسية
- **Unique constraints** على repId/month/year للtargets

---

## الخطوات القادمة (Future Enhancements)

1. **Supabase Integration** - التحويل من SQLite الى Supabase PostgreSQL
2. **Push Notifications** - اشعارات الفورية
3. **Real-time Tracking** - تتبع مباشر للمندوبين
4. **Advanced Reports** - تقارير متقدمة مع تصدير
5. **Mobile App** - تطبيق موبايل بـ React Native
6. **Multi-company Support** - دعم شركات متعددة
7. **API Versioning** - اصدارات الـ API
8. **Unit Tests** - اختبارات شاملة

---

## ملخص

**PharmaTrack** هو نظام CRM متكامل واحترافي لإدارة فرق المبيعات الميدانية في الصيدلية. يوفر:
- ✅ **3 واجهات**: Admin, Manager, Rep
- ✅ **21 API Route** مع مصادقة JWT
- ✅ **12 نموذج** في قاعدة البيانات
- ✅ **خريطة Leaflet حقيقية** مع GPS verification
- ✅ **200m threshold** للتحقق من الزيارات
- ✅ **Dark/Light mode** مع تبديل سلس
- ✅ **RTL Support** بالعربية
- ✅ **Responsive Design** للموبايل والديسكتوب
- ✅ **Report System** مع رسوم بيانية
- ✅ **Target Tracking** للمندوبين
- ✅ **73 طبيب** في Alexandria, Egypt كداتا تجريبية
