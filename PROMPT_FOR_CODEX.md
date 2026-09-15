#_prompt_for_codex_gpt

# Pharmacy Field Force CRM - Complete Technical Specification

## PROJECT GOAL
Build a complete SaaS platform called **PharmaTrack** for pharmaceutical companies to manage their field sales teams (Medical Reps), doctors, visits, GPS tracking, targets, and reports. The entire UI must be in **Arabic (RTL)** with real data from **Alexandria, Egypt**.

---

## TECH STACK

```
Framework:     Next.js 16+ (App Router)
UI:            React 19 + TypeScript
Styling:       Tailwind CSS v4
Database:      Prisma ORM + SQLite (file:./dev.db)
Auth:          NextAuth.js v4 (Credentials Provider + JWT)
Maps:          Leaflet + react-leaflet + OpenStreetMap (free, no API key)
Charts:        Recharts
Icons:         Lucide React
Dark Mode:     next-themes
i18n:          Custom (ar/en)
Excel:         xlsx library
File Download: file-saver
Password Hash: bcryptjs
```

---

## DATABASE SCHEMA (Prisma)

### Enums
```prisma
enum UserRole { ADMIN MANAGER MEDICAL_REP }
enum DoctorPriority { A B C }
enum InterestLevel { HIGH MEDIUM LOW }
enum VisitPurpose { DETAILING FOLLOW_UP PRODUCT_LAUNCH SAMPLE_DELIVERY MEDICAL_EDUCATION RELATIONSHIP_BUILDING }
enum VisitStatus { IN_PROGRESS COMPLETED CANCELLED }
enum DoctorResponse { VERY_INTERESTED INTERESTED NEUTRAL NOT_INTERESTED }
enum FollowUpActionType { CALL VISIT SEND_INFO OTHER }
enum FollowUpStatus { PENDING COMPLETED MISSED }
enum NotificationType { VISIT FOLLOW_UP TARGET SYSTEM ASSIGNMENT }
enum SubscriptionPlan { BASIC PROFESSIONAL ENTERPRISE }
```

### Models

#### Company
- id (cuid), name, slug (unique), logo?, settings (JSON string), subscription, createdAt, updatedAt

#### User
- id (cuid), email (unique), password (bcrypt hashed), name, phone?, employeeId?, role (UserRole), profileImage?, jobTitle?, isActive (default true), companyId, managerId? (self-relation for hierarchy), workingDays (JSON string, default "[0,1,2,3,4]"), workingHours (JSON string, default '{"start":"09:00","end":"17:00"}'), createdAt, updatedAt
- Relations: company, manager (self), subordinates (self), repDoctorLinks, visits, followUps, targets, notifications, auditLogs

#### Specialty
- id (cuid), name, companyId
- Relations: company, doctors

#### Doctor
- id (cuid), name, phone?, email?, specialtyId, subSpecialty?, gender?, clinicName?, address?, governorate?, city?, latitude (Float?), longitude (Float?), priority (DoctorPriority, default B), companyId, createdAt, updatedAt
- Relations: company, specialty, schedules, locations, repDoctorLinks, visits, followUps

#### DoctorSchedule
- id (cuid), doctorId, doctorLocationId?, dayOfWeek (Int), startTime (String), endTime (String)

#### DoctorLocation
- id (cuid), doctorId, name, address?, latitude?, longitude?, isPrimary (default false)

#### Product
- id (cuid), name, genericName?, category?, description?, dosageInfo?, companyId, isActive (default true), createdAt

#### RepDoctor (link table)
- id (cuid), repId, doctorId, interestLevel (default MEDIUM), notes?, createdAt
- Unique constraint: [repId, doctorId]

#### Visit
- id (cuid), repId, doctorId, doctorLocationId?, visitPurpose (VisitPurpose), status (default IN_PROGRESS), startTime, endTime?, duration? (Int, minutes), latitude?, longitude?, distanceFromDoctor? (Float), isVerified (default false), doctorResponse?, notes?, nextFollowUpDate?, nextFollowUpType?, nextFollowUpNotes?, companyId, createdAt
- Relations: rep, doctor, doctorLocation, company, visitProducts, followUps

#### VisitProduct
- id (cuid), visitId, productId
- Unique: [visitId, productId]

#### FollowUp
- id (cuid), repId, doctorId, visitId?, dueDate, actionType (FollowUpActionType), notes?, status (default PENDING), completedAt?, companyId, createdAt

#### Target
- id (cuid), repId, month (Int), year (Int), totalVisits (default 0), totalDoctors (default 0), newDoctors (default 0), followUps (default 0), companyId, createdAt
- Unique: [repId, month, year]

#### Notification
- id (cuid), userId, title, message, type (NotificationType), isRead (default false), createdAt

#### AuditLog
- id (cuid), userId, action, entity, entityId?, metadata (JSON string), companyId, createdAt

#### Subscription
- id (cuid), companyId (unique), plan (default BASIC), maxUsers (default 5), startDate, endDate?, isActive (default true)

---

## SEED DATA

Create a seed file `prisma/seed.ts` with REAL data from Alexandria, Egypt:

### Users (5)
| name | email | password | role |
|------|-------|----------|------|
| احمد حسن | admin@pharmavet.com | password123 (bcrypt) | ADMIN |
| محمد علي | manager@pharmavet.com | password123 | MANAGER |
| عمر محمود | rep1@pharmavet.com | password123 | MEDICAL_REP |
| فاطمه ابراهيم | rep2@pharmavet.com | password123 | MEDICAL_REP |
| يوسف خالد | rep3@pharmavet.com | password123 | MEDICAL_REP |

All users belong to the same company (companyId).

### Company
- name: "نيل فارما جروب"
- slug: "nile-pharma"
- subscription: PROFESSIONAL

### Specialties (10)
امراض القلب, امراض المخ والاعصاب, جراحة العظام, اطفال, امراض الجلدية, الباطنه, طب عام, انف واذن وحنجره, العيون, المسالك البوليه

### Doctors (73 total)
- **62 doctors in Alexandria** across 27 neighborhoods with REAL lat/lng coordinates:
  سموحه (31.2137, 29.9449), المندره (31.2489, 29.9637), سيدي جابر (31.2117, 29.9450), رشدي (31.2013, 29.9325), كليوباترا (31.2230, 29.9480), المنشيه (31.2000, 29.8980), كفر عبدي (31.2180, 29.9310), ستانلي (31.2022, 29.8880), الابراهيميه (31.2280, 29.9570), جناكليس (31.2350, 29.9620), فليمنج (31.2090, 29.9380), سيدي بشر (31.2370, 29.9590), العباسيه (31.2200, 29.9420), جليم (31.2250, 29.9510), سبا باشا (31.2320, 29.9560), المواسه (31.2080, 29.9290), المكس (31.1750, 29.8750), باب شرق (31.2050, 29.9050), اللبان (31.2300, 29.9530), كرموز (31.1960, 29.8880), الدخيله (31.1850, 29.8600), محطه الرمل (31.2010, 29.9020), ابوراشه (31.2070, 29.9240), الاسافره (31.1980, 29.8860), العامريه (31.1990, 29.8930), الميناء (31.1810, 29.8480), الانفوشى (31.2060, 29.8940), اللبنات (31.2160, 29.9350), بورتاج (31.1950, 29.8750), الضاهر (31.1980, 29.8920)
- Each doctor has: Arabic name, phone, email, clinic name, specialty, priority (A/B/C), gender
- Add slight jitter to neighborhood coordinates for realism

- **6 doctors in Matrouh**: المطروح, الضبعه, فوكه, السلوم, سيوه
- **5 doctors in Cairo**: مصر الجديده, مدينه نصر, المعادي, الزمالك, وسط البلد

### Products (8)
Cardivex (قلب), Neurozen (اعصاب), Pediacare (اطفال), Osteovit (عظام), Gastromin (باطنه), Allerfree (حساسية), Glucomin (سكري), Dermaglow (جلدية)

### Visits (25)
- Spread across rep1, rep2, rep3
- Various dates from 2026-09-01 to 2026-09-15
- Different statuses (COMPLETED, IN_PROGRESS)
- Various visit purposes

### Targets
- Monthly targets for each rep (e.g., 40 visits, 15 doctors, 5 new doctors)

---

## UI PAGES

### Auth Pages

#### `/login` - Login Page
- Animated gradient background with floating pill shapes
- Feature cards with hover effects (Nearby Doctors, Track Visits, Smart Targets)
- Email/Phone toggle tabs
- Password show/hide toggle
- "Remember me" checkbox + "Forgot password" link
- Demo hint: `admin@pharmavet.com / password123`
- On login: redirect based on role → `/admin`, `/manager`, or `/rep`
- RTL layout, Arabic labels

#### `/forgot-password` - Forgot Password (simple page)

### Admin Pages (`/admin/*`)

Admin layout: **Collapsible sidebar** (desktop) + main content area.

#### `/admin` - Dashboard
- Stats cards (Total Reps, Total Doctors, Visits Today, Pending Follow-ups, Target Achievement)
- Bar chart: Visits over time (Sat-Fri in Arabic)
- Pie chart: Doctor specialties distribution
- Quick actions grid: Add Employee, Add Doctor, Add Product, View Reports, Settings

#### `/admin/employees` - Employees List
- Table with: Name, Role, Status, Actions
- Link to `/admin/employees/new`

#### `/admin/employees/new` - Add Employee Form
- Fields: Name, Email, Phone, Password, Role (Manager/Medical Rep), Manager (dropdown)

#### `/admin/doctors` - Doctors List
- Table with: Name, Specialty, Priority (A/B/C badge), Governorate, Actions
- Link to `/admin/doctors/new` and `/admin/doctors/import`

#### `/admin/doctors/new` - Add Doctor Form
- Fields: Name, Phone, Email, Specialty (dropdown), Priority, Gender, Clinic Name, Address, Governorate, City, Latitude, Longitude

#### `/admin/doctors/import` - Import Doctors from Excel
- Upload Excel file, parse, preview, confirm import

#### `/admin/products` - Products List
- Cards grid showing products with: Name, Generic Name, Category, Description

#### `/admin/reports` - Reports Page
- Tab buttons: Visits | Performance | Doctors
- **Visits tab**: Summary cards (total, completed, in-progress, cancelled, verified, avg duration) + Bar chart by rep
- **Performance tab**: Table (rep name, total visits, completed, unique doctors, target, achievement %) + Bar chart
- **Doctors tab**: Bar chart (visits per doctor) + Pie chart (by specialty) + Table list
- Export button

#### `/admin/targets` - Targets Page
- Cards for each rep showing: name, month/year, target visits, current visits, progress bar, achievement %

#### `/admin/settings` - Settings Page
- Company info (name, email, phone, address)
- Working hours (start/end time, working days checkboxes)
- GPS settings (max distance 200m, tracking interval 5min, auto-stop toggle)
- Notification settings (toggle switches)

### Manager Pages (`/manager/*`)

Manager layout: **Sidebar** (same as admin but different nav items).

#### `/manager` - Dashboard
- Stats cards for team performance
- Charts showing team visits and achievements

#### `/manager/team` - Team Management
- List of medical reps with their stats
- Link to individual rep details

#### `/manager/visits` - Team Visits
- Table of all team visits with filters

#### `/manager/targets` - Team Targets
- Targets overview for all reps

#### `/manager/reports` - Reports
- Similar to admin reports but scoped to team

#### `/manager/map` - Live Map
- **Full-page Leaflet map** showing all team members' locations
- Real-time tracking display
- Heatmap layer option

### Rep Pages (`/rep/*`)

Rep layout: **Mobile-first** with bottom navigation bar (5 tabs) + floating action button.

#### `/rep` - Home Dashboard
- Stats cards: Today's Visits, My Doctors, Pending Follow-ups
- Recent visits list

#### `/rep/nearby` - Nearby Doctors
- **Real Leaflet map** with current location marker
- List of nearby doctors sorted by distance
- Distance badge on each doctor card
- "Open Full Map" link to `/rep/nearby/map`

#### `/rep/nearby/map` - Full Screen Map
- Full-screen Leaflet map
- Current location marker (blue)
- Doctor markers with specialty-colored icons
- 200m radius circle around current location
- Doctor popup with info + "Start Visit" button

#### `/rep/my-doctors` - My Doctors
- List of assigned doctors with: Name, Specialty, Priority, Last Visit, Next Visit

#### `/rep/my-doctors/[id]` - Doctor Profile
- Full doctor details
- Visit history
- Notes
- "Start Visit" button

#### `/rep/visits/start` - Start Visit
- Doctor selector (dropdown or search)
- **GPS Verification**:
  1. Request location permission
  2. Get current position
  3. Calculate distance to doctor (Haversine formula)
  4. If distance > 200m: BLOCK visit, show "You must be within 200m of the doctor"
  5. If distance <= 200m: ALLOW visit, show green checkmark
- "Start Visit" button (only enabled when verified)

#### `/rep/visits/active` - Active Visit
- Visit timer (counting up from start time)
- Doctor info card
- Products to discuss (multi-select checkboxes)
- Doctor response selector (Very Interested / Interested / Neutral / Not Interested)
- Notes textarea
- Next follow-up date picker
- "Complete Visit" button

#### `/rep/schedule` - Schedule
- Calendar/list view of upcoming visits

#### `/rep/follow-ups` - Follow-ups
- List of pending follow-ups with due dates
- Action types: Call, Visit, Send Info

#### `/rep/profile` - Profile
- User info display
- Settings

---

## API ROUTES (21 routes)

All API routes must check `getServerSession(authOptions)` for authentication. Return 401 if no session.

### Auth
- `POST /api/auth/[...nextauth]` - NextAuth handler
- `POST /api/auth/register` - Register new user
- `GET /api/auth/session` - Get current session

### Core Data
- `GET /api/stats` - Dashboard statistics (role-based: admin sees all, rep sees own)
- `GET/POST /api/doctors` - List/Create doctors
- `GET/PUT/DELETE /api/doctors/[id]` - Read/Update/Delete doctor
- `GET /api/doctors/nearby?lat=&lng=` - Doctors near coordinates (returns sorted by distance)
- `POST /api/doctors/import` - Import from Excel
- `GET/POST /api/employees` - List/Create employees
- `GET/PUT/DELETE /api/employees/[id]` - CRUD employee
- `GET /api/visits` - List visits (filtered by role)
- `POST /api/visits/start` - Start a new visit (validates GPS)
- `POST /api/visits/complete` - Complete a visit
- `GET /api/visits/[id]` - Get visit details
- `GET /api/my-doctors` - Rep's assigned doctors
- `GET /api/my-doctors/[id]` - Assigned doctor details
- `GET/POST /api/targets` - List/Create targets
- `GET /api/reports?type=visits|performance|doctors|territory` - Reports data
- `GET/POST /api/products` - List/Create products
- `GET/PUT/DELETE /api/products/[id]` - CRUD product
- `GET /api/follow-ups` - List follow-ups
- `GET /api/notifications` - List notifications

---

## KEY COMPONENTS

### UI Components (src/components/ui/)
```
Button.tsx    - Variants: primary (teal gradient), secondary, ghost, danger, outline
              - Sizes: sm, md, lg
              - Loading state with spinner
Card.tsx      - Variants: elevated (shadow), flat, bordered
              - CardHeader, CardTitle, CardContent sub-components
Input.tsx     - With label, leftIcon, error state
Badge.tsx     - Variants: default, success (green), warning (yellow), danger (red)
Avatar.tsx    - Shows initials from name, sizes: sm, md, lg
Select.tsx    - Dropdown select with label
Tabs.tsx      - Tab component
```

### Layout Components (src/components/layout/)
```
Sidebar.tsx       - Admin sidebar: collapsible, nav items, user info at bottom
                   Nav: Dashboard, Employees, Doctors, Products, Reports, Settings
ManagerLayout.tsx - Manager layout with sidebar
RepLayout.tsx     - Mobile layout with BottomNav (5 tabs) + FAB button
AuthLayout.tsx    - Login page layout with card
Header.tsx        - Top header with search, notifications, user menu
BottomNav.tsx     - Bottom navigation for rep (Home, Map, Doctors, Schedule, Profile)
```

### Map Component (src/components/map-view.tsx)
```tsx
// Uses dynamic import for Leaflet (SSR issues)
// Props: center, zoom, markers, userLocation, showRadius, radiusMeters
// Features:
// - OpenStreetMap tiles (free, no API key)
// - User location marker (blue pulsing)
// - Doctor markers with popup info
// - 200m radius circle (red dashed)
// - Click to get coordinates
```

### Geo Utilities (src/lib/geo.ts)
```tsx
calculateDistance(coord1, coord2) → meters  // Haversine formula
formatDistance(meters) → "200 m" or "1.5 km"
isLocationVerified(repCoords, doctorCoords, threshold=200) → boolean
getCurrentPosition() → Promise<GeoCoordinates>  // Browser Geolocation API
watchPosition(callback, onError) → watchId
clearWatch(watchId) → void
```

### i18n (src/lib/i18n.ts)
- Two locales: 'ar' (default) and 'en'
- 100+ translation keys covering all UI text
- Arabic is primary language

### Theme (src/components/theme-provider.tsx + theme-toggle.tsx)
- Uses next-themes
- Toggle button with sun/moon icons
- Saves preference in localStorage
- Supports dark:bg-slate-900, dark:text-slate-100 etc.

### Locale (src/lib/locale-context.tsx + language-toggle.tsx)
- Custom context for ar/en
- Toggle button with globe icon
- Default: Arabic

---

## AUTH FLOW

1. User enters email + password on `/login`
2. `signIn("credentials", { email, password, redirect: false })` called
3. NextAuth `authorize()` function:
   - Find user by email in Prisma
   - Compare password with bcrypt
   - Return user object (id, email, name, role, companyId)
4. JWT callback stores: id, role, companyId, phone, profileImage
5. Session callback maps JWT to session.user
6. After login, fetch `/api/auth/session` to get role
7. Redirect: ADMIN → `/admin`, MANAGER → `/manager`, MEDICAL_REP → `/rep`

### Middleware/Protection
- All `/admin/*` routes require ADMIN role
- All `/manager/*` routes require MANAGER role
- All `/rep/*` routes require MEDICAL_REP role
- API routes check session server-side

---

## GPS VERIFICATION LOGIC

```tsx
// When rep starts a visit:
1. Request browser geolocation permission
2. Get current position (lat, lng)
3. Fetch doctor's coordinates from database
4. Calculate distance using Haversine formula
5. If distance > 200 meters:
   - Show error: "يجب ان تكون في نطاق 200 متر من العيادة"
   - Block visit start
   - Show distance on map
6. If distance <= 200 meters:
   - Show success: "تم التحقق بنجاح"
   - Allow visit start
   - Store: latitude, longitude, distanceFromDoctor, isVerified=true
```

---

## DESIGN SYSTEM

### Colors
```
Primary: teal-600 to blue-700 gradient
Success: green-500/green-600
Warning: yellow-500/yellow-600
Danger: red-500/red-600
Background: slate-50 (light) / slate-900 (dark)
Cards: white (light) / slate-800 (dark)
Text: slate-900 (light) / slate-100 (dark)
Borders: slate-200 (light) / slate-700 (dark)
```

### Typography
- Arabic font: system default (supports Arabic natively)
- Headings: font-bold, text-2xl/text-xl
- Body: text-sm/text-base
- Labels: text-sm font-medium

### Spacing
- Page padding: p-4 lg:p-6
- Card padding: p-4 md:p-6
- Grid gaps: gap-4 to gap-6
- Section spacing: space-y-6

---

## RESPONSIVE BREAKPOINTS
```
Mobile:  < 640px  (single column, bottom nav for rep)
Tablet:  640-1024px (2 columns)
Desktop: > 1024px (sidebar + content, 3 columns)
```

---

## ARABIC RTL REQUIREMENTS
- All text is Arabic by default
- `dir="rtl"` on html element
- Sidebar on right side (for RTL)
- Text alignment: text-right on labels
- Margins/paddings flipped for RTL
- Number display: LTR within Arabic text

---

## FILE STRUCTURE

```
pharma-crm/
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── dev.db
├── src/
│   ├── app/
│   │   ├── layout.tsx              (root layout with AuthProvider + ThemeProvider + LocaleProvider)
│   │   ├── page.tsx                (redirect to /login)
│   │   ├── globals.css             (Tailwind + custom animations)
│   │   ├── (auth)/login/page.tsx
│   │   ├── (auth)/forgot-password/page.tsx
│   │   ├── admin/layout.tsx        (Sidebar layout)
│   │   ├── admin/page.tsx          (Dashboard)
│   │   ├── admin/employees/page.tsx
│   │   ├── admin/employees/new/page.tsx
│   │   ├── admin/doctors/page.tsx
│   │   ├── admin/doctors/new/page.tsx
│   │   ├── admin/doctors/import/page.tsx
│   │   ├── admin/products/page.tsx
│   │   ├── admin/reports/page.tsx
│   │   ├── admin/targets/page.tsx
│   │   ├── admin/settings/page.tsx
│   │   ├── manager/layout.tsx      (Sidebar layout)
│   │   ├── manager/page.tsx
│   │   ├── manager/team/page.tsx
│   │   ├── manager/visits/page.tsx
│   │   ├── manager/targets/page.tsx
│   │   ├── manager/reports/page.tsx
│   │   ├── manager/map/page.tsx
│   │   ├── rep/layout.tsx          (BottomNav layout)
│   │   ├── rep/page.tsx
│   │   ├── rep/nearby/page.tsx
│   │   ├── rep/nearby/map/page.tsx
│   │   ├── rep/my-doctors/page.tsx
│   │   ├── rep/my-doctors/[id]/page.tsx
│   │   ├── rep/visits/start/page.tsx
│   │   ├── rep/visits/active/page.tsx
│   │   ├── rep/schedule/page.tsx
│   │   ├── rep/follow-ups/page.tsx
│   │   ├── rep/profile/page.tsx
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts
│   │       ├── auth/register/route.ts
│   │       ├── stats/route.ts
│   │       ├── doctors/route.ts
│   │       ├── doctors/[id]/route.ts
│   │       ├── doctors/nearby/route.ts
│   │       ├── doctors/import/route.ts
│   │       ├── employees/route.ts
│   │       ├── employees/[id]/route.ts
│   │       ├── visits/route.ts
│   │       ├── visits/start/route.ts
│   │       ├── visits/complete/route.ts
│   │       ├── visits/[id]/route.ts
│   │       ├── my-doctors/route.ts
│   │       ├── my-doctors/[id]/route.ts
│   │       ├── targets/route.ts
│   │       ├── reports/route.ts
│   │       ├── products/route.ts
│   │       ├── products/[id]/route.ts
│   │       ├── follow-ups/route.ts
│   │       └── notifications/route.ts
│   ├── components/
│   │   ├── ui/ (Button, Card, Input, Badge, Avatar, Select, Tabs)
│   │   ├── layout/ (Sidebar, Header, BottomNav, AuthLayout, RepLayout, ManagerLayout)
│   │   ├── auth-provider.tsx
│   │   ├── theme-provider.tsx
│   │   ├── theme-toggle.tsx
│   │   ├── language-toggle.tsx
│   │   ├── map-view.tsx
│   │   └── file-upload.tsx
│   ├── lib/
│   │   ├── auth.ts                 (NextAuth config)
│   │   ├── auth-context.tsx        (useAuth hook)
│   │   ├── prisma.ts               (Prisma singleton)
│   │   ├── geo.ts                  (Haversine, GPS utils)
│   │   ├── i18n.ts                 (translations ar/en)
│   │   ├── use-translations.ts
│   │   ├── locale-context.tsx
│   │   └── types.ts
│   └── styles/
│       └── globals.css
├── .env
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.js
```

---

## .env FILE
```
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="pharma-crm-secret-key-2024-change-in-production"
NEXTAUTH_URL="http://localhost:3000"
```

---

## SETUP COMMANDS
```bash
npx create-next-app@latest pharma-crm --typescript --tailwind --app --src-dir
cd pharma-crm
npm install prisma @prisma/client next-auth@4 bcryptjs leaflet react-leaflet recharts next-themes lucide-react xlsx file-saver date-fns
npm install -D @types/leaflet @types/file-saver tsx
npx prisma init
# ... write schema.prisma ...
npx prisma db push
npx prisma generate
npx tsx prisma/seed.ts
npm run dev
```

---

## CRITICAL REQUIREMENTS

1. **All UI text in Arabic** - Every label, button, heading, placeholder in Arabic
2. **RTL layout** - Everything flows right-to-left
3. **Real GPS coordinates** - Alexandria neighborhoods with real lat/lng
4. **Leaflet map works** - Dynamic import (no SSR), OpenStreetMap tiles
5. **GPS verification** - 200m threshold enforced, visit blocked if too far
6. **JWT auth** - Session includes role + companyId for all API checks
7. **Role-based routing** - Admin sees admin pages, Manager sees manager, Rep sees rep
8. **Dark mode** - Works everywhere with next-themes
9. **Responsive** - Mobile (rep) uses bottom nav, Desktop (admin/manager) uses sidebar
10. **Collapsible sidebar** - Admin/Manager sidebar collapses to icons on toggle

---

## COMMON MISTAKES TO AVOID

1. Don't use Mapbox or Google Maps - use **Leaflet + OpenStreetMap** (free)
2. Don't forget `dynamic` import for map component (SSR issue with Leaflet)
3. Don't hardcode coordinates - use real Alexandria neighborhoods
4. Don't skip bcrypt - all passwords must be hashed
5. Don't use `redirect: true` in signIn - use `redirect: false` and handle manually
6. Don't forget `getServerSession(authOptions)` in ALL API routes
7. Don't use English for UI - everything must be Arabic
8. Don't forget the `Working Hours` display-only feature
9. Don't skip the 200m GPS verification - it's a core feature
10. Don't create duplicate route groups like `(admin)` and `admin` - pick one

---

## FINAL NOTES

This is a **complete MVP** for a pharmaceutical field force CRM. The application should be fully functional with:
- Working login/auth with real database
- Real map with real coordinates
- GPS verification for visits
- CRUD operations for doctors, employees, products
- Reports with charts
- Target tracking
- Dark mode
- Arabic RTL
- Mobile responsive

Build everything from scratch. Do not leave any pages as placeholders. Every page should have real functionality.
