#!/usr/bin/env python
"""
Database seeding script for PharmaTrack FastAPI backend.
Creates initial organization, users, specialties, and sample doctors.
"""
import asyncio
import sys
import os
from datetime import datetime
import bcrypt

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import AsyncSessionLocal, engine
from app.models import (
    Organization, User, UserRole, DoctorSpecialty, Doctor,
    DoctorPriority, Product, Subscription, SubscriptionPlan,
    DoctorLocation, Target,
)
from sqlalchemy import select


async def seed():
    async with AsyncSessionLocal() as db:
        print("🌱 Starting database seed...")

        # Check if already seeded
        result = await db.execute(select(Organization).limit(1))
        if result.scalar_one_or_none():
            print("Database already seeded, skipping...")
            return

        # Create organization
        company = Organization(
            name="نيل فارما جروب",
            slug="nile-pharma",
            logo="/logos/nilepharma.png",
            settings={
                "timezone": "Africa/Cairo",
                "currency": "EGP",
                "language": "ar",
                "visitDuration": 15,
                "maxDailyVisits": 15,
                "gpsRadius": 200,
            },
            subscription="PROFESSIONAL"
        )
        db.add(company)
        await db.flush()
        print(f"✓ Created company: {company.name}")

        # Create subscription
        subscription = Subscription(
            organization_id=company.id,
            plan=SubscriptionPlan.PROFESSIONAL,
            max_users=50,
            start_date=datetime(2024, 1, 1),
            end_date=datetime(2026, 12, 31),
            is_active=True
        )
        db.add(subscription)

        # Hash password
        hashed_password = bcrypt.hashpw(b"password123", bcrypt.gensalt(12)).decode()

        # Create users
        admin = User(
            email="admin@pharmavet.com",
            password_hash=hashed_password,
            name="احمد حسن",
            phone="+201223456700",
            role=UserRole.ADMIN,
            is_active=True,
            company_id=company.id,
            employee_id="EMP-001",
            job_title="System Administrator",
        )
        db.add(admin)

        manager = User(
            email="manager@pharmavet.com",
            password_hash=hashed_password,
            name="محمد علي",
            phone="+201223456701",
            role=UserRole.MANAGER,
            is_active=True,
            company_id=company.id,
            employee_id="EMP-002",
            job_title="Sales Manager",
        )
        db.add(manager)

        rep1 = User(
            email="rep1@pharmavet.com",
            password_hash=hashed_password,
            name="عمر محمود",
            phone="+201223456702",
            role=UserRole.MEDICAL_REP,
            is_active=True,
            company_id=company.id,
            manager_id=manager.id,
            employee_id="REP-001",
            job_title="Medical Representative",
        )
        db.add(rep1)

        rep2 = User(
            email="rep2@pharmavet.com",
            password_hash=hashed_password,
            name="فاطمه ابراهيم",
            phone="+201223456703",
            role=UserRole.MEDICAL_REP,
            is_active=True,
            company_id=company.id,
            manager_id=manager.id,
            employee_id="REP-002",
            job_title="Medical Representative",
        )
        db.add(rep2)

        rep3 = User(
            email="rep3@pharmavet.com",
            password_hash=hashed_password,
            name="يوسف خالد",
            phone="+201223456704",
            role=UserRole.MEDICAL_REP,
            is_active=True,
            company_id=company.id,
            manager_id=manager.id,
            employee_id="REP-003",
            job_title="Medical Representative",
        )
        db.add(rep3)

        await db.flush()
        print(f"✓ Created users: admin, manager, 3 reps")

        # Create specialties
        specialties_data = [
            "امراض القلب",
            "امراض المخ والاعصاب",
            "جراحة العظام",
            "اطفال",
            "امراض الجلدية",
            "الباطنه",
            "طب عام",
            "انف واذن وحنجره",
            "العيون",
            "المسالك البوليه",
        ]

        specialties = {}
        for spec_name in specialties_data:
            spec = DoctorSpecialty(name=spec_name, organization_id=company.id)
            db.add(spec)
            await db.flush()
            specialties[spec_name] = spec.id

        print(f"✓ Created {len(specialties)} specialties")

        # Alexandria neighborhoods with coordinates
        alexandria_neighborhoods = {
            'سموحه': (31.2137, 29.9449),
            'المندره': (31.2489, 29.9637),
            'سيدي جابر': (31.2117, 29.9450),
            'رشدي': (31.2013, 29.9325),
            'كليوباترا': (31.2230, 29.9480),
            'المنشيه': (31.2000, 29.8980),
            'كفر عبدي': (31.2180, 29.9310),
            'ستانلي': (31.2022, 29.8880),
            'الابراهيميه': (31.2280, 29.9570),
            'جناكليس': (31.2350, 29.9620),
            'فليمنج': (31.2090, 29.9380),
            'سيدي بشر': (31.2370, 29.9590),
            'العباسيه': (31.2200, 29.9420),
            'جليم': (31.2250, 29.9510),
            'سبا باشا': (31.2320, 29.9560),
            'المواسه': (31.2080, 29.9290),
            'المكس': (31.1750, 29.8750),
            'باب شرق': (31.2050, 29.9050),
            'اللبان': (31.2300, 29.9530),
            'كرموز': (31.1960, 29.8880),
            'الدخيله': (31.1850, 29.8600),
            'محطه الرمل': (31.2010, 29.9020),
            'ابوراشه': (31.2070, 29.9240),
            'الاسافره': (31.1980, 29.8860),
            'العامريه': (31.1990, 29.8930),
            'الميناء': (31.1810, 29.8480),
            'الانفوشى': (31.2060, 29.8940),
            'اللبنات': (31.2160, 29.9350),
            'بورتاج': (31.1950, 29.8750),
            'الضاهر': (31.1980, 29.8920),
        }

        # Sample doctors data (subset for demo)
        doctors_data = [
            # قلب - 7 doctors
            {"name": "أ.د. حسام الدين فوزي", "specialty": "امراض القلب", "gender": "ذكر", "clinic": "مركز القلب الاسكندري", "neighborhood": "سموحه", "priority": "A", "phone": "+201223456701", "email": "h.fawzy@clinic.com"},
            {"name": "د. احمد كمال مصطفى", "specialty": "امراض القلب", "gender": "ذكر", "clinic": "عياده كليوباترا للقلب", "neighborhood": "كليوباترا", "priority": "A", "phone": "+201223456702", "email": "a.mostafa@clinic.com"},
            {"name": "د. منى صلاح الدين", "specialty": "امراض القلب", "gender": "انثي", "clinic": "مركز قلب الابراهيميه", "neighborhood": "الابراهيميه", "priority": "A", "phone": "+201223456703", "email": "m.eldin@clinic.com"},
            {"name": "د. طارق محمد حسين", "specialty": "امراض القلب", "gender": "ذكر", "clinic": "عياده قلب سموحه", "neighborhood": "سموحه", "priority": "A", "phone": "+201223456704", "email": "t.hussein@clinic.com"},
            
            # مخ واعصاب - 6 doctors
            {"name": "أ.د. يوسف فاروق حنفي", "specialty": "امراض المخ والاعصاب", "gender": "ذكر", "clinic": "المركز الاسكندري للمخ والاعصاب", "neighborhood": "المنشيه", "priority": "A", "phone": "+201223456801", "email": "y.hanafy@clinic.com"},
            {"name": "د. ناديه حسن محمد", "specialty": "امراض المخ والاعصاب", "gender": "انثي", "clinic": "عياده الدماغ والعمود الفقري", "neighborhood": "فليمنج", "priority": "A", "phone": "+201223456802", "email": "n.mohamed@clinic.com"},
            {"name": "د. شريف عادل بشر", "specialty": "امراض المخ والاعصاب", "gender": "ذكر", "clinic": "عياده مخ واعصاب سيدي جابر", "neighborhood": "سيدي جابر", "priority": "A", "phone": "+201223456803", "email": "s.bishr@clinic.com"},
            
            # عظام - 6 doctors
            {"name": "أ.د. محمود سامح خميس", "specialty": "جراحة العظام", "gender": "ذكر", "clinic": "المركز الاسكندري لجراحة العظام", "neighborhood": "المنشيه", "priority": "A", "phone": "+201223456901", "email": "m.khamis@clinic.com"},
            {"name": "د. فاطمه عبد الرؤوف المرسي", "specialty": "جراحة العظام", "gender": "انثي", "clinic": "عياده عظام و مفاصل سموحه", "neighborhood": "سموحه", "priority": "A", "phone": "+201223456902", "email": "f.elmorsy@clinic.com"},
            
            # اطفال - 7 doctors
            {"name": "أ.د. نفين حلمي محسن", "specialty": "اطفال", "gender": "انثي", "clinic": "مستشفى اطفال الاسكندريه", "neighborhood": "كليوباترا", "priority": "A", "phone": "+201223457001", "email": "n.mohsen@clinic.com"},
            {"name": "د. وليد محمد الصاوي", "specialty": "اطفال", "gender": "ذكر", "clinic": "عياده اطفال سموحه", "neighborhood": "سموحه", "priority": "A", "phone": "+201223457002", "email": "w.elsawy@clinic.com"},
            
            # جلدية - 5 doctors
            {"name": "أ.د. لاميه الكومي محمود", "specialty": "امراض الجلدية", "gender": "انثي", "clinic": "مركز الاسكندريه للجلد والليزر", "neighborhood": "سموحه", "priority": "A", "phone": "+201223457101", "email": "l.mahmoud@clinic.com"},
            {"name": "د. عمرو محمد العرابي", "specialty": "امراض الجلدية", "gender": "ذكر", "clinic": "عياده جلدية كليوباترا", "neighborhood": "كليوباترا", "priority": "A", "phone": "+201223457102", "email": "a.elaraby@clinic.com"},
            
            # باطنة - 6 doctors
            {"name": "أ.د. محمد عبد الحميد بيومي", "specialty": "الباطنه", "gender": "ذكر", "clinic": "المركز الاسكندري للباطنه", "neighborhood": "المنشيه", "priority": "A", "phone": "+201223457201", "email": "m.bayoumi@clinic.com"},
            {"name": "د. سحر محمد الملت", "specialty": "الباطنه", "gender": "انثي", "clinic": "عياده باطنه سيدي جابر", "neighborhood": "سيدي جابر", "priority": "A", "phone": "+201223457202", "email": "s.elmalt@clinic.com"},
        ]

        created_count = 0
        for i, doc_data in enumerate(doctors_data):
            neighborhood = doc_data["neighborhood"]
            lat, lng = alexandria_neighborhoods.get(neighborhood, (31.2001, 29.9187))
            
            # Add small jitter
            import random
            lat += (random.random() - 0.5) * 0.002
            lng += (random.random() - 0.5) * 0.002

            doctor = Doctor(
                name=doc_data["name"],
                phone=doc_data["phone"],
                email=doc_data["email"],
                specialty_id=specialties[doc_data["specialty"]],
                sub_specialty=None,
                gender=doc_data["gender"],
                clinic_name=doc_data["clinic"],
                address=f"{neighborhood}, الإسكندرية",
                governorate="الإسكندرية",
                city="الإسكندرية",
                latitude=lat,
                longitude=lng,
                priority=DoctorPriority(doc_data["priority"]),
                organization_id=company.id,
            )
            db.add(doctor)
            await db.flush()

            # Add primary location
            location = DoctorLocation(
                doctor_id=doctor.id,
                name=doc_data["clinic"],
                address=f"{neighborhood}, الإسكندرية",
                latitude=lat,
                longitude=lng,
                is_primary=True,
            )
            db.add(location)
            created_count += 1

        print(f"✓ Created {created_count} doctors with locations")

        # Create products
        products_data = [
            {"name": "Cardivex", "generic_name": "Valsartan", "category": "قلب", "description": "علاج ارتفاع ضغط الدم", "dosage_info": "80mg, 160mg"},
            {"name": "Neurozen", "generic_name": "Pregabalin", "category": "اعصاب", "description": "علاج الآلام العصبية", "dosage_info": "75mg, 150mg"},
            {"name": "Pediacare", "generic_name": "Amoxicillin", "category": "اطفال", "description": "مضاد حيوي للأطفال", "dosage_info": "250mg/5ml, 500mg/5ml"},
            {"name": "Osteovit", "generic_name": "Calcium + Vitamin D3", "category": "عظام", "description": "مكمل غذائي للعظام", "dosage_info": "600mg/400IU"},
            {"name": "Gastromin", "generic_name": "Omeprazole", "category": "باطنة", "description": "مثبط مضخة البروتون", "dosage_info": "20mg, 40mg"},
            {"name": "Allerfree", "generic_name": "Cetirizine", "category": "حساسية", "description": "مضاد للهستامين", "dosage_info": "10mg"},
            {"name": "Glucomin", "generic_name": "Metformin", "category": "سكري", "description": "علاج السكري نوع 2", "dosage_info": "500mg, 850mg, 1000mg"},
            {"name": "Dermaglow", "generic_name": "Hydrocortisone", "category": "جلدية", "description": "كريم للالتهابات الجلدية", "dosage_info": "1%"},
        ]

        for prod_data in products_data:
            product = Product(
                name=prod_data["name"],
                generic_name=prod_data["generic_name"],
                category=prod_data["category"],
                description=prod_data["description"],
                dosage_info=prod_data["dosage_info"],
                organization_id=company.id,
                is_active=True,
            )
            db.add(product)

        print(f"✓ Created {len(products_data)} products")

        # Create targets for reps
        for rep in [rep1, rep2, rep3]:
            target = Target(
                rep_id=rep.id,
                month=9,
                year=2026,
                total_visits=40,
                total_doctors=15,
                new_doctors=5,
                follow_ups=10,
                organization_id=company.id,
            )
            db.add(target)

        print(f"✓ Created targets for 3 reps")

        # Commit all
        await db.commit()
        print("\n✅ Database seeding completed successfully!")
        print("\n📋 Login credentials:")
        print("  Admin:    admin@pharmavet.com    / password123")
        print("  Manager:  manager@pharmavet.com  / password123")
        print("  Rep 1:    rep1@pharmavet.com     / password123")
        print("  Rep 2:    rep2@pharmavet.com     / password123")
        print("  Rep 3:    rep3@pharmavet.com     / password123")


async def main():
    try:
        await seed()
    except Exception as e:
        print(f"✗ Seeding failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())