import pathlib
from datetime import datetime

root = pathlib.Path(r"C:\Users\ATG\Documents\Default Project\pharma-crm")
out = root / "PROJECT_STATUS.md"

content = """# NEMORA — Project Status

**آخر تحديث:** """ + datetime.now().strftime("%Y-%m-%d %H:%M") + """

---

## ✅ المكتمل

### البنية التحتية
- PostgreSQL + PostGIS على Supabase
- FastAPI backend على port 8000
- Next.js 16 frontend على port 3000
- Alembic migrations (6 مراحل)

### الأمان
- JWT authentication
- RBAC (Admin / Manager / Medical Rep)
- Multi-tenant isolation
- Audit logs

### الدكاترة
- 328 دكتور مستوردين من Google Maps
- 19 تخصص
- إحداثيات GPS محفوظة
- فلاتر + بحث + بروفايل كامل
- مواعيد أسبوعية قابلة للتعديل
- ملاحظاتي (Rep-editable)

### الفريق
- إدارة أعضاء (Add/Edit/Deactivate)
- تخصصات للمندوبين

### واجهة المندوب
- Dashboard + Shift (Start/End)
- My Doctors (بفلاتر)
- بروفايل الدكتور منظم
- هيدر فخم مع اسم الشركة

### التقارير والإعدادات
- Reports + Activity chart + Specialty breakdown
- تصدير CSV (Doctors / Visits / Specialties)
- Settings (اسم الشركة + GPS + ساعات + إشعارات)

---

## ⏳ المتبقي

### 1. الزيارات (Visits) — الأهم
- Backend: check-in / check-out APIs
- PostGIS distance verification
- Frontend /rep/visits page
- Audit log لكل زيارة
- Daily report on shift end

### 2. Nearby (GPS Search)
- /rep/nearby page
- Leaflet map + current location
- Filter by radius & specialty

### 3. Live Map للأدمن
- /admin/map with team locations
- Heatmap
- Track لكل مندوب

### 4. Plan + AI
- /rep/plan page
- Route optimization (PostGIS)
- Local AI (Ollama) suggestions

### 5. SaaS
- Landing Page
- Subscription plans
- Payment integration

---

## 🔧 الروابط المهمة

- Frontend: http://localhost:3000
- Backend API: http://127.0.0.1:8000/docs
- Supabase: https://supabase.com/dashboard/project/lqtzorufwtllchixrgag
- GitHub: https://github.com/JasonWade45/Nemora-project

---

## 🚀 التالي فوراً

**الزيارات (Visits)** — مع GPS Verification:
1. Backend endpoints
2. PostGIS distance calculation
3. Frontend flow
4. Testing

---

## 🗂️ الأوامر المهمة

### تشغيل الباك إند

### بيانات الدخول
- Admin: admin@nemora.com / NemoraAdmin2025
- Rep: Mahmoud@nemora.com / (الباسورد اللي حطيته)

### Organization
- Name: MACRO
- Slug: nemora-demo
"""

out.write_text(content, encoding="utf-8")
print("OK - PROJECT_STATUS.md created")
print("Path:", out)