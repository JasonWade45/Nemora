import { PrismaClient, UserRole, DoctorPriority, InterestLevel, VisitPurpose, VisitStatus, DoctorResponse, FollowUpActionType, FollowUpStatus, NotificationType, SubscriptionPlan } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const ALEXANDRIA_NEIGHBORHOODS: Record<string, { lat: number; lng: number }> = {
  'سموحه': { lat: 31.2137, lng: 29.9449 },
  'المندره': { lat: 31.2489, lng: 29.9637 },
  'سيدي جابر': { lat: 31.2117, lng: 29.9450 },
  'رشدي': { lat: 31.2013, lng: 29.9325 },
  'كليوباترا': { lat: 31.2230, lng: 29.9480 },
  'المنشيه': { lat: 31.2000, lng: 29.8980 },
  'كفر عبدي': { lat: 31.2180, lng: 29.9310 },
  'ستانلي': { lat: 31.2022, lng: 29.8880 },
  'الابراهيميه': { lat: 31.2280, lng: 29.9570 },
  'جناكليس': { lat: 31.2350, lng: 29.9620 },
  'فليمنج': { lat: 31.2090, lng: 29.9380 },
  'سيدي بشر': { lat: 31.2370, lng: 29.9590 },
  'العباسيه': { lat: 31.2200, lng: 29.9420 },
  'جليم': { lat: 31.2250, lng: 29.9510 },
  'سبا باشا': { lat: 31.2320, lng: 29.9560 },
  'المواسه': { lat: 31.2080, lng: 29.9290 },
  'المكس': { lat: 31.1750, lng: 29.8750 },
  'باب شرق': { lat: 31.2050, lng: 29.9050 },
  'اللبان': { lat: 31.2300, lng: 29.9530 },
  'كرموز': { lat: 31.1960, lng: 29.8880 },
  'الدخيله': { lat: 31.1850, lng: 29.8600 },
  'محطه الرمل': { lat: 31.2010, lng: 29.9020 },
  'ابوراشه': { lat: 31.2070, lng: 29.9240 },
  'الاسافره': { lat: 31.1980, lng: 29.8860 },
  'العامريه': { lat: 31.1990, lng: 29.8930 },
  'الميناء': { lat: 31.1810, lng: 29.8480 },
  'الانفوشى': { lat: 31.2060, lng: 29.8940 },
  'اللبنات': { lat: 31.2160, lng: 29.9350 },
  'بورتاج': { lat: 31.1950, lng: 29.8750 },
  'الضاهر': { lat: 31.1980, lng: 29.8920 },
};

function jitter(base: number, range: number = 0.002): number {
  return base + (Math.random() - 0.5) * range;
}

const DOCTORS_DATA = [
  // امراض القلب (7)
  { name: 'أ.د. حسام الدين فوزي', specialty: 'امراض القلب', gender: 'ذكر', clinic: 'مركز القلب الاسكندري', hospital: null, neighborhood: 'سموحه', priority: 'A' as const, phone: '+201223456701', email: 'h.fawzy@clinic.com' },
  { name: 'د. احمد كمال مصطفى', specialty: 'امراض القلب', gender: 'ذكر', clinic: 'عياده كليوباترا للقلب', hospital: null, neighborhood: 'كليوباترا', priority: 'A' as const, phone: '+201223456702', email: 'a.mostafa@clinic.com' },
  { name: 'د. منى صلاح الدين', specialty: 'امراض القلب', gender: 'انثي', clinic: 'مركز قلب الابراهيميه', hospital: 'مستشفى الحضره الجامعي', neighborhood: 'الابراهيميه', priority: 'A' as const, phone: '+201223456703', email: 'm.eldin@clinic.com' },
  { name: 'د. طارق محمد حسين', specialty: 'امراض القلب', gender: 'ذكر', clinic: 'عياده قلب سموحه', hospital: 'مستشفى سموحه الدولي', neighborhood: 'سموحه', priority: 'A' as const, phone: '+201223456704', email: 't.hussein@clinic.com' },
  { name: 'د. هبه علي عبد الفتاح', specialty: 'امراض القلب', gender: 'انثي', clinic: 'عياده قلب ستانلي', hospital: 'مركز ستانلي الطبي', neighborhood: 'ستانلي', priority: 'B' as const, phone: '+201223456705', email: 'h.afattah@clinic.com' },
  { name: 'د. خالد ابراهيم نبيل', specialty: 'امراض القلب', gender: 'ذكر', clinic: 'مركز قلب بورسعيد', hospital: 'مستشفى بورسعيد العام', neighborhood: 'كفر عبدي', priority: 'B' as const, phone: '+201223456706', email: 'k.nabil@clinic.com' },
  { name: 'د. رانيا محمود السيد', specialty: 'امراض القلب', gender: 'انثي', clinic: 'مركز قلب السكه السكانيه', hospital: 'مركز السكه السكانيه الطبي', neighborhood: 'المواسه', priority: 'C' as const, phone: '+201223456707', email: 'r.sayed@clinic.com' },

  // امراض المخ والاعصاب (6)
  { name: 'أ.د. يوسف فاروق حنفي', specialty: 'امراض المخ والاعصاب', gender: 'ذكر', clinic: 'المركز الاسكندري للمخ والاعصاب', hospital: 'مستشفى الاسكندريه الجامعي', neighborhood: 'المنشيه', priority: 'A' as const, phone: '+201223456801', email: 'y.hanafy@clinic.com' },
  { name: 'د. ناديه حسن محمد', specialty: 'امراض المخ والاعصاب', gender: 'انثي', clinic: 'عياده الدماغ والعمود الفقري', hospital: null, neighborhood: 'فليمنج', priority: 'A' as const, phone: '+201223456802', email: 'n.mohamed@clinic.com' },
  { name: 'د. شريف عادل بشر', specialty: 'امراض المخ والاعصاب', gender: 'ذكر', clinic: 'عياده مخ واعصاب سيدي جابر', hospital: 'مستشفى الملك فهد الجامعي', neighborhood: 'سيدي جابر', priority: 'A' as const, phone: '+201223456803', email: 's.bishr@clinic.com' },
  { name: 'د. داليا مصطفى كمال', specialty: 'امراض المخ والاعصاب', gender: 'انثي', clinic: 'مركز جناكليس للمخ والاعصاب', hospital: 'مستشفى جناكليس العام', neighborhood: 'جناكليس', priority: 'B' as const, phone: '+201223456804', email: 'd.kamal@clinic.com' },
  { name: 'د. وليد حمدي الخولي', specialty: 'امراض المخ والاعصاب', gender: 'ذكر', clinic: 'عياده مخ واعصاب المندره', hospital: 'مستشفى المندره العام', neighborhood: 'المندره', priority: 'B' as const, phone: '+201223456805', email: 'w.elkholy@clinic.com' },
  { name: 'د. اميره محمد الشامي', specialty: 'امراض المخ والاعصاب', gender: 'انثي', clinic: 'مركز المواسه للمخ والاعصاب', hospital: 'مستشفى الموسسه العام', neighborhood: 'المواسه', priority: 'C' as const, phone: '+201223456806', email: 'a.elshamy@clinic.com' },

  // جراحة العظام (6)
  { name: 'أ.د. محمود سامح خميس', specialty: 'جراحة العظام', gender: 'ذكر', clinic: 'المركز الاسكندري لجراحة العظام', hospital: 'مستشفى الاسكندريه الجامعي', neighborhood: 'المنشيه', priority: 'A' as const, phone: '+201223456901', email: 'm.khamis@clinic.com' },
  { name: 'د. فاطمه عبد الرؤوف المرسي', specialty: 'جراحة العظام', gender: 'انثي', clinic: 'عياده عظام و مفاصل سموحه', hospital: 'مستشفى سموحه الدولي', neighborhood: 'سموحه', priority: 'A' as const, phone: '+201223456902', email: 'f.elmorsy@clinic.com' },
  { name: 'د. محمد جمال الشريف', specialty: 'جراحة العظام', gender: 'ذكر', clinic: 'عياده عظامبورسعيد', hospital: 'مستشفى النور', neighborhood: 'ابوراشه', priority: 'A' as const, phone: '+201223456903', email: 'm.elsherif@clinic.com' },
  { name: 'د. هاني صلاح الدين', specialty: 'جراحة العظام', gender: 'ذكر', clinic: 'مركز رشدي للمفاصل', hospital: null, neighborhood: 'رشدي', priority: 'B' as const, phone: '+201223456904', email: 'h.eldin@clinic.com' },
  { name: 'د. سلمى احمد بيومي', specialty: 'جراحة العظام', gender: 'انثي', clinic: 'عياده عظام كفر عبدي', hospital: 'مركز كفر عبدي الطبي', neighborhood: 'كفر عبدي', priority: 'B' as const, phone: '+201223456905', email: 's.bayoumi@clinic.com' },
  { name: 'د. اشرف ناصر جمعه', specialty: 'جراحة العظام', gender: 'ذكر', clinic: 'مركز عظام بورسعيد', hospital: 'مستشفى بورسعيد العام', neighborhood: 'كفر عبدي', priority: 'C' as const, phone: '+201223456906', email: 'a.gomaa@clinic.com' },

  // اطفال (7)
  { name: 'أ.د. نفين حلمي محسن', specialty: 'اطفال', gender: 'انثي', clinic: 'مستشفى اطفال الاسكندريه', hospital: 'مركز اطفال الاسكندريه', neighborhood: 'كليوباترا', priority: 'A' as const, phone: '+201223457001', email: 'n.mohsen@clinic.com' },
  { name: 'د. وليد محمد الصاوي', specialty: 'اطفال', gender: 'ذكر', clinic: 'عياده اطفال سموحه', hospital: 'مستشفى سموحه الدولي', neighborhood: 'سموحه', priority: 'A' as const, phone: '+201223457002', email: 'w.elsawy@clinic.com' },
  { name: 'د. ياسمين حسن الجندي', specialty: 'اطفال', gender: 'انثي', clinic: 'مركز اطفال الابراهيميه', hospital: 'مستشفى الحضره الجامعي', neighborhood: 'الابراهيميه', priority: 'A' as const, phone: '+201223457003', email: 'y.elguindy@clinic.com' },
  { name: 'د. هشام عبد الحميد سالم', specialty: 'اطفال', gender: 'ذكر', clinic: 'عياده اطفال المندره', hospital: 'مستشفى المندره العام', neighborhood: 'المندره', priority: 'B' as const, phone: '+201223457004', email: 'h.salem@clinic.com' },
  { name: 'د. ميسون نبيل البيلي', specialty: 'اطفال', gender: 'انثي', clinic: 'مركز اطفال سيدي بشر', hospital: 'مركز سيدي بشر الطبي', neighborhood: 'سيدي بشر', priority: 'B' as const, phone: '+201223457005', email: 'm.elbeely@clinic.com' },
  { name: 'د. اسلام محمد فathi', specialty: 'اطفال', gender: 'ذكر', clinic: 'مركز اطفال المكس', hospital: 'مستشفى المكس العام', neighborhood: 'المكس', priority: 'B' as const, phone: '+201223457006', email: 'i.fathi@clinic.com' },
  { name: 'د. نورهان صلاح الدين', specialty: 'اطفال', gender: 'انثي', clinic: 'عياده اطفال بورسعيد', hospital: 'مستشفى بورسعيد العام', neighborhood: 'كفر عبدي', priority: 'C' as const, phone: '+201223457007', email: 'n.eldin@clinic.com' },

  // امراض الجلدية (5)
  { name: 'أ.د. لاميه الكومي محمود', specialty: 'امراض الجلدية', gender: 'انثي', clinic: 'مركز الاسكندريه للجلد والليزر', hospital: null, neighborhood: 'سموحه', priority: 'A' as const, phone: '+201223457101', email: 'l.mahmoud@clinic.com' },
  { name: 'د. عمرو محمد العرابي', specialty: 'امراض الجلدية', gender: 'ذكر', clinic: 'عياده جلدية كليوباترا', hospital: 'مستشفى كليوباترا', neighborhood: 'كليوباترا', priority: 'A' as const, phone: '+201223457102', email: 'a.elaraby@clinic.com' },
  { name: 'د. ياسمين عبد اللطيف مصطفى', specialty: 'امراض الجلدية', gender: 'انثي', clinic: 'عياده جلد فليمنج', hospital: 'مستشفى فليمنج', neighborhood: 'فليمنج', priority: 'B' as const, phone: '+201223457103', email: 'y.mostafa@clinic.com' },
  { name: 'د. محمود علي الشوره', specialty: 'امراض الجلدية', gender: 'ذكر', clinic: 'مركز رشدي للجمال', hospital: null, neighborhood: 'رشدي', priority: 'B' as const, phone: '+201223457104', email: 'm.elshoura@clinic.com' },
  { name: 'د. غاده ابراهيم الدين', specialty: 'امراض الجلدية', gender: 'انثي', clinic: 'مركز العباسيه للجلد', hospital: 'مركز العباسيه الطبي', neighborhood: 'العباسيه', priority: 'C' as const, phone: '+201223457105', email: 'g.eldin@clinic.com' },

  // الباطنه (6)
  { name: 'أ.د. محمد عبد الحميد بيومي', specialty: 'الباطنه', gender: 'ذكر', clinic: 'المركز الاسكندري للباطنه', hospital: 'مستشفى الاسكندريه الجامعي', neighborhood: 'المنشيه', priority: 'A' as const, phone: '+201223457201', email: 'm.bayoumi@clinic.com' },
  { name: 'د. سحر محمد الملت', specialty: 'الباطنه', gender: 'انثي', clinic: 'عياده باطنه سيدي جابر', hospital: 'مستشفى الملك فهد الجامعي', neighborhood: 'سيدي جابر', priority: 'A' as const, phone: '+201223457202', email: 's.elmalt@clinic.com' },
  { name: 'د. تامر حسين عوض', specialty: 'الباطنه', gender: 'ذكر', clinic: 'عياده عامه سموحه', hospital: 'مستشفى سموحه الدولي', neighborhood: 'سموحه', priority: 'A' as const, phone: '+201223457203', email: 't.awad@clinic.com' },
  { name: 'د. هند صالح البهيري', specialty: 'الباطنه', gender: 'انثي', clinic: 'مركز جناكليس للباطنه', hospital: 'مستشفى جناكليس العام', neighborhood: 'جناكليس', priority: 'B' as const, phone: '+201223457204', email: 'h.elbeheiry@clinic.com' },
  { name: 'د. سامح فوزي الشاعر', specialty: 'الباطنه', gender: 'ذكر', clinic: 'عياده عامه الاسافره', hospital: 'مستشفى الاسافره العام', neighborhood: 'الاسافره', priority: 'B' as const, phone: '+201223457205', email: 's.elshaer@clinic.com' },
  { name: 'د. منال حسين الطيب', specialty: 'الباطنه', gender: 'انثي', clinic: 'مركز كرموز الطبي', hospital: 'مركز كرموز الطبي', neighborhood: 'كرموز', priority: 'C' as const, phone: '+201223457206', email: 'm.eltayeb@clinic.com' },

  // طب عام (5)
  { name: 'د. عبد الله محمد رسلان', specialty: 'طب عام', gender: 'ذكر', clinic: 'عياده عائله المنشيه', hospital: null, neighborhood: 'المنشيه', priority: 'B' as const, phone: '+201223457301', email: 'a.raslan@clinic.com' },
  { name: 'د. فاطمه حسن عبد العزيز', specialty: 'طب عام', gender: 'انثي', clinic: 'مركز عائله السكه السكانيه', hospital: 'مركز السكه السكانيه الطبي', neighborhood: 'المواسه', priority: 'B' as const, phone: '+201223457302', email: 'f.abdelaziz@clinic.com' },
  { name: 'د. محمد صلاح الدين احمد', specialty: 'طب عام', gender: 'ذكر', clinic: 'عياده عائله باب شرق', hospital: 'مركز باب شرق الطبي', neighborhood: 'باب شرق', priority: 'B' as const, phone: '+201223457303', email: 'm.ahmed@clinic.com' },
  { name: 'د. ايناس عبد الفتاح السيد', specialty: 'طب عام', gender: 'انثي', clinic: 'مركز صحه الميناء', hospital: 'مستشفى الميناء العام', neighborhood: 'الميناء', priority: 'C' as const, phone: '+201223457304', email: 'e.sayed@clinic.com' },
  { name: 'د. حسام الدين مصطفى الخولي', specialty: 'طب عام', gender: 'ذكر', clinic: 'عياده عائله العامريه', hospital: 'مركز العامريه الطبي', neighborhood: 'العامريه', priority: 'C' as const, phone: '+201223457305', email: 'h.elkholy@clinic.com' },

  // انف واذن وحنجره (5)
  { name: 'أ.د. جمال عبد المنعم حسن', specialty: 'انف واذن وحنجره', gender: 'ذكر', clinic: 'المركز الاسكندري للانف والاذن', hospital: 'مستشفى الاسكندريه الجامعي', neighborhood: 'المنشيه', priority: 'A' as const, phone: '+201223457401', email: 'g.hassan@clinic.com' },
  { name: 'د. اماني محمد السيد', specialty: 'انف واذن وحنجره', gender: 'انثي', clinic: 'عياده انف واذن وحنجره سموحه', hospital: 'مستشفى سموحه الدولي', neighborhood: 'سموحه', priority: 'A' as const, phone: '+201223457402', email: 'a.elsayed@clinic.com' },
  { name: 'د. محمد رضا البهيري', specialty: 'انف واذن وحنجره', gender: 'ذكر', clinic: 'عياده انف واذن المندره', hospital: 'مستشفى المندره العام', neighborhood: 'المندره', priority: 'B' as const, phone: '+201223457403', email: 'r.elbeheiry@clinic.com' },
  { name: 'د. منى فتحي عبد الوهاب', specialty: 'انف واذن وحنجره', gender: 'انثي', clinic: 'مركز بورسعيد للانف والاذن', hospital: 'مركز بورسعيد الطبي', neighborhood: 'كفر عبدي', priority: 'B' as const, phone: '+201223457404', email: 'm.abdelwahab@clinic.com' },
  { name: 'د. عماد صلاح الدين عباس', specialty: 'انف واذن وحنجره', gender: 'ذكر', clinic: 'عياده انف واذن اللبنات', hospital: 'مركز اللبنات الطبي', neighborhood: 'اللبنات', priority: 'C' as const, phone: '+201223457405', email: 'e.abbas@clinic.com' },

  // العيون (5)
  { name: 'أ.د. ماجد مرجان ميخائيل', specialty: 'العيون', gender: 'ذكر', clinic: 'المركز الاسكندري للعيون', hospital: 'مستشفى الاسكندريه الجامعي', neighborhood: 'المنشيه', priority: 'A' as const, phone: '+201223457501', email: 'm.mikhail@clinic.com' },
  { name: 'د. دينا هشامالمغربي', specialty: 'العيون', gender: 'انثي', clinic: 'عياده عيون سموحه', hospital: 'مستشفى سموحه الدولي', neighborhood: 'سموحه', priority: 'A' as const, phone: '+201223457502', email: 'd.elmaghribi@clinic.com' },
  { name: 'د. محمد ابو الفتوح سالم', specialty: 'العيون', gender: 'ذكر', clinic: 'مركز عيون الابراهيميه', hospital: 'مستشفى الحضره الجامعي', neighborhood: 'الابراهيميه', priority: 'B' as const, phone: '+201223457503', email: 'm.salem@clinic.com' },
  { name: 'د. نيرمين سامح عبد الجليل', specialty: 'العيون', gender: 'انثي', clinic: 'عياده عيون جليم', hospital: 'مركز جليم الطبي', neighborhood: 'جليم', priority: 'B' as const, phone: '+201223457504', email: 'n.abdelgalil@clinic.com' },
  { name: 'د. احمد فوزي المصري', specialty: 'العيون', gender: 'ذكر', clinic: 'مركز عيون سيدي بشر', hospital: 'مركز سيدي بشر الطبي', neighborhood: 'سيدي بشر', priority: 'C' as const, phone: '+201223457505', email: 'a.elmasry@clinic.com' },

  // المسالك البوليه (5)
  { name: 'أ.د. احمد منصور الحميد', specialty: 'المسالك البوليه', gender: 'ذكر', clinic: 'المركز الاسكندري للمسالك البوليه', hospital: 'مستشفى الاسكندريه الجامعي', neighborhood: 'المنشيه', priority: 'A' as const, phone: '+201223457601', email: 'a.elhamid@clinic.com' },
  { name: 'د. محمد علي الشerbini', specialty: 'المسالك البوليه', gender: 'ذكر', clinic: 'عياده مسالك بوليه سموحه', hospital: 'مستشفى سموحه الدولي', neighborhood: 'سموحه', priority: 'A' as const, phone: '+201223457602', email: 'm.elsherbini@clinic.com' },
  { name: 'د. هله ابراهيم الدويني', specialty: 'المسالك البوليه', gender: 'انثي', clinic: 'مركز مسالك فليمنج', hospital: 'مستشفى فليمنج', neighborhood: 'فليمنج', priority: 'B' as const, phone: '+201223457603', email: 'h.eldiwany@clinic.com' },
  { name: 'د. طارق عبد المجيد موسى', specialty: 'المسالك البوليه', gender: 'ذكر', clinic: 'عياده مسالك الدخيله', hospital: 'مركز الدخيله الطبي', neighborhood: 'الدخيله', priority: 'B' as const, phone: '+201223457604', email: 't.mousa@clinic.com' },
  { name: 'د. سلوى محمد البندري', specialty: 'المسالك البوليه', gender: 'انثي', clinic: 'مركز مسالك الانفوشى', hospital: 'مركز الانفوشى الطبي', neighborhood: 'الانفوشى', priority: 'C' as const, phone: '+201223457605', email: 's.elbendary@clinic.com' },

  // doctors from additional areas
  { name: 'د. بسمه مصطفى كامل', specialty: 'امراض القلب', gender: 'ذكر', clinic: 'مركز قلب الضاهر', hospital: 'مركز الضاهر الطبي', neighborhood: 'الضاهر', priority: 'B' as const, phone: '+201223457701', email: 'b.kamel@clinic.com' },
  { name: 'د. حنان عبد العزيز الجمل', specialty: 'الباطنه', gender: 'انثي', clinic: 'عياده عامه اللبان', hospital: 'مركز اللبان الطبي', neighborhood: 'اللبان', priority: 'B' as const, phone: '+201223457702', email: 'h.elgamal@clinic.com' },
  { name: 'د. ياسر محمد الجوهري', specialty: 'جراحة العظام', gender: 'ذكر', clinic: 'مركز عظام بورتاج', hospital: 'مركز بورتاج الطبي', neighborhood: 'بورتاج', priority: 'B' as const, phone: '+201223457703', email: 'y.elgohary@clinic.com' },
  { name: 'د. مروه صلاح الدين', specialty: 'اطفال', gender: 'انثي', clinic: 'عياده اطفال سبا باشا', hospital: 'مركز سبا باشا الطبي', neighborhood: 'سبا باشا', priority: 'B' as const, phone: '+201223457704', email: 'm.eldin2@clinic.com' },
  { name: 'د. وليد السيد المصري', specialty: 'امراض الجلدية', gender: 'ذكر', clinic: 'مركز جلد الاسافره', hospital: 'مستشفى الاسافره العام', neighborhood: 'الاسافره', priority: 'C' as const, phone: '+201223457705', email: 'w.elmasry@clinic.com' },
];

const MATROUH_DATA = [
  { name: 'د. عبد الرحمن سالم مسعود', specialty: 'طب عام', gender: 'ذكر', clinic: 'عياده مطروح العامه', hospital: null, neighborhood: 'مطروح', lat: 31.3543, lng: 27.2453, priority: 'A' as const, phone: '+201223458001', email: 'a.masoud@clinic.com' },
  { name: 'د. فاطمه علي المبسوط', specialty: 'الباطنه', gender: 'انثي', clinic: 'مركز الضبعه الطبي', hospital: null, neighborhood: 'الضبعه', lat: 31.0133, lng: 28.4289, priority: 'A' as const, phone: '+201223458002', email: 'f.elmabsout@clinic.com' },
  { name: 'د. محمد حسن السيد', specialty: 'اطفال', gender: 'ذكر', clinic: 'مركز فوكه الصحي', hospital: null, neighborhood: 'فوكه', lat: 31.0817, lng: 27.8725, priority: 'B' as const, phone: '+201223458003', email: 'm.elsayed2@clinic.com' },
  { name: 'د. عايشه محمود السعيد', specialty: 'انف واذن وحنجره', gender: 'انثي', clinic: 'مركز السلوم الطبي', hospital: null, neighborhood: 'السلوم', lat: 31.3394, lng: 25.1572, priority: 'B' as const, phone: '+201223458004', email: 'a.elsaied@clinic.com' },
  { name: 'د. يوسف كمال فرج', specialty: 'جراحة العظام', gender: 'ذكر', clinic: 'مركز سيوه الطبي', hospital: null, neighborhood: 'سيوه', lat: 29.2032, lng: 25.5195, priority: 'B' as const, phone: '+201223458005', email: 'y.farag@clinic.com' },
  { name: 'د. هدا عبد الحميد فتحي', specialty: 'طب عام', gender: 'انثي', clinic: 'عياده الضبعه العامه', hospital: null, neighborhood: 'الضبعه', lat: 31.0150, lng: 28.4300, priority: 'C' as const, phone: '+201223458006', email: 'h.fathy@clinic.com' },
];

const CAIRO_DATA = [
  { name: 'د. شريف عبد الوهاب المرسي', specialty: 'امراض القلب', gender: 'ذكر', clinic: 'مركز القلب بالقاهره', hospital: null, neighborhood: 'مصر الجديده', lat: 30.0870, lng: 31.3237, priority: 'A' as const, phone: '+201223459001', email: 's.elmorsy@clinic.com' },
  { name: 'د. نيره صلاح الدين', specialty: 'امراض المخ والاعصاب', gender: 'انثي', clinic: 'عياده مخ واعصاب مدينه نصر', hospital: null, neighborhood: 'مدينه نصر', lat: 30.0567, lng: 31.3486, priority: 'A' as const, phone: '+201223459002', email: 'n.eldin@clinic.com' },
  { name: 'د. هشام محمد فوزي', specialty: 'اطفال', gender: 'ذكر', clinic: 'مركز اطفال المعادي', hospital: null, neighborhood: 'المعادي', lat: 29.9602, lng: 31.2573, priority: 'A' as const, phone: '+201223459003', email: 'h.fawzy@clinic.com' },
  { name: 'د. رندا عادل بشر', specialty: 'امراض الجلدية', gender: 'انثي', clinic: 'جلد وليزر الزمالك', hospital: null, neighborhood: 'الزمالك', lat: 30.0461, lng: 31.2243, priority: 'A' as const, phone: '+201223459004', email: 'r.bishr@clinic.com' },
  { name: 'د. تامر حسين البهيري', specialty: 'المسالك البوليه', gender: 'ذكر', clinic: 'المركز الطبي وسط البلد', hospital: null, neighborhood: 'وسط البلد', lat: 30.0525, lng: 31.2335, priority: 'A' as const, phone: '+201223459005', email: 't.elbeheiry@clinic.com' },
];

async function main() {
  console.log('🌱 انشاء قاعدة البيانات ببيانات اسكندريه الحقيقيه...');

  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.visitProduct.deleteMany();
  await prisma.visit.deleteMany();
  await prisma.followUp.deleteMany();
  await prisma.target.deleteMany();
  await prisma.repDoctor.deleteMany();
  await prisma.doctorSchedule.deleteMany();
  await prisma.doctorLocation.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.product.deleteMany();
  await prisma.specialty.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.user.deleteMany();
  await prisma.company.deleteMany();

  const company = await prisma.company.create({
    data: {
      name: 'نيل فارما جروب',
      slug: 'nile-pharma',
      logo: '/logos/nilepharma.png',
      settings: JSON.stringify({
        timezone: 'Africa/Cairo',
        currency: 'EGP',
        language: 'ar',
        visitDuration: 15,
        maxDailyVisits: 15,
        gpsRadius: 200,
      }),
      subscription: 'PROFESSIONAL'
    }
  });

  console.log('✅ تم انشاء الشركه:', company.name);

  await prisma.subscription.create({
    data: {
      companyId: company.id,
      plan: SubscriptionPlan.PROFESSIONAL,
      maxUsers: 50,
      startDate: new Date('2024-01-01'),
      endDate: new Date('2026-12-31'),
      isActive: true
    }
  });

  const hashedPassword = await bcrypt.hash('password123', 12);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@pharmavet.com',
      password: hashedPassword,
      name: 'احمد حسن',
      phone: '+201234567890',
      employeeId: 'EMP001',
      role: UserRole.ADMIN,
      jobTitle: 'مدير المناطق',
      isActive: true,
      companyId: company.id,
      workingDays: JSON.stringify([0, 1, 2, 3, 4]),
      workingHours: JSON.stringify({ start: '09:00', end: '17:00' })
    }
  });

  const manager = await prisma.user.create({
    data: {
      email: 'manager@pharmavet.com',
      password: hashedPassword,
      name: 'محمد علي',
      phone: '+201234567891',
      employeeId: 'EMP002',
      role: UserRole.MANAGER,
      jobTitle: 'مدير مبيعات المنطقة',
      isActive: true,
      companyId: company.id,
      managerId: admin.id,
      workingDays: JSON.stringify([0, 1, 2, 3, 4]),
      workingHours: JSON.stringify({ start: '08:30', end: '17:30' })
    }
  });

  const reps = await Promise.all([
    prisma.user.create({
      data: {
        email: 'rep1@pharmavet.com', password: hashedPassword, name: 'عمر محمود',
        phone: '+201234567892', employeeId: 'EMP003', role: UserRole.MEDICAL_REP,
        jobTitle: 'مندوب مبيعات طبي', isActive: true, companyId: company.id, managerId: manager.id,
        workingDays: JSON.stringify([0, 1, 2, 3, 4]),
        workingHours: JSON.stringify({ start: '09:00', end: '17:00' })
      }
    }),
    prisma.user.create({
      data: {
        email: 'rep2@pharmavet.com', password: hashedPassword, name: 'فاطمه ابراهيم',
        phone: '+201234567893', employeeId: 'EMP004', role: UserRole.MEDICAL_REP,
        jobTitle: 'مندوب مبيعات طبي', isActive: true, companyId: company.id, managerId: manager.id,
        workingDays: JSON.stringify([0, 1, 2, 3, 4]),
        workingHours: JSON.stringify({ start: '09:00', end: '17:00' })
      }
    }),
    prisma.user.create({
      data: {
        email: 'rep3@pharmavet.com', password: hashedPassword, name: 'يوسف خالد',
        phone: '+201234567894', employeeId: 'EMP005', role: UserRole.MEDICAL_REP,
        jobTitle: 'مندوب مبيعات طبي', isActive: true, companyId: company.id, managerId: manager.id,
        workingDays: JSON.stringify([0, 1, 2, 3, 4]),
        workingHours: JSON.stringify({ start: '09:00', end: '17:00' })
      }
    })
  ]);

  console.log('✅ تم انشاء المستخدمين');

  const specialtyNames = ['امراض القلب', 'امراض المخ والاعصاب', 'جراحة العظام', 'اطفال', 'امراض الجلدية', 'الباطنه', 'طب عام', 'انف واذن وحنجره', 'العيون', 'المسالك البوليه'];
  const specialties = await Promise.all(
    specialtyNames.map(name => prisma.specialty.create({ data: { name, companyId: company.id } }))
  );
  const specMap = Object.fromEntries(specialties.map(s => [s.name, s.id]));

  const allDoctors = [];
  let phoneCounter = 0;

  for (const doc of DOCTORS_DATA) {
    const hood = ALEXANDRIA_NEIGHBORHOODS[doc.neighborhood] || { lat: 31.2000, lng: 29.9200 };
    const lat = jitter(hood.lat, 0.003);
    const lng = jitter(hood.lng, 0.003);

    const doctor = await prisma.doctor.create({
      data: {
        name: doc.name,
        phone: doc.phone,
        email: doc.email,
        specialtyId: specMap[doc.specialty],
        gender: doc.gender,
        clinicName: doc.clinic,
        address: `${doc.neighborhood}, اسكندريه, مصر`,
        governorate: 'اسكندريه',
        city: doc.neighborhood,
        latitude: lat,
        longitude: lng,
        priority: doc.priority,
        companyId: company.id,
      }
    });

    await prisma.doctorLocation.create({
      data: {
        doctorId: doctor.id,
        name: doc.clinic,
        address: `${doc.neighborhood}, اسكندريه`,
        latitude: lat,
        longitude: lng,
        isPrimary: true,
      }
    });

    const schedulePattern = phoneCounter % 3 === 0
      ? { days: [0, 1, 2], start: '09:00', end: '14:00' }
      : phoneCounter % 3 === 1
        ? { days: [1, 2, 3, 4], start: '10:00', end: '15:00' }
        : { days: [0, 1, 2, 3, 4], start: '16:00', end: '21:00' };

    for (const day of schedulePattern.days) {
      await prisma.doctorSchedule.create({
        data: {
          doctorId: doctor.id,
          dayOfWeek: day,
          startTime: schedulePattern.start,
          endTime: schedulePattern.end,
        }
      });
    }

    allDoctors.push(doctor);
    phoneCounter++;
  }

  for (const doc of MATROUH_DATA) {
    const lat = jitter(doc.lat, 0.005);
    const lng = jitter(doc.lng, 0.005);

    const doctor = await prisma.doctor.create({
      data: {
        name: doc.name,
        phone: doc.phone,
        email: doc.email,
        specialtyId: specMap[doc.specialty],
        gender: doc.gender,
        clinicName: doc.clinic,
        address: `${doc.neighborhood}, مطروح, مصر`,
        governorate: 'مطروح',
        city: doc.neighborhood,
        latitude: lat,
        longitude: lng,
        priority: doc.priority,
        companyId: company.id,
      }
    });

    await prisma.doctorLocation.create({
      data: {
        doctorId: doctor.id,
        name: doc.clinic,
        address: `${doc.neighborhood}, مطروح`,
        latitude: lat,
        longitude: lng,
        isPrimary: true,
      }
    });

    for (const day of [0, 1, 2, 3, 4]) {
      await prisma.doctorSchedule.create({
        data: { doctorId: doctor.id, dayOfWeek: day, startTime: '09:00', endTime: '14:00' }
      });
    }

    allDoctors.push(doctor);
  }

  for (const doc of CAIRO_DATA) {
    const lat = jitter(doc.lat, 0.003);
    const lng = jitter(doc.lng, 0.003);

    const doctor = await prisma.doctor.create({
      data: {
        name: doc.name,
        phone: doc.phone,
        email: doc.email,
        specialtyId: specMap[doc.specialty],
        gender: doc.gender,
        clinicName: doc.clinic,
        address: `${doc.neighborhood}, القاهره, مصر`,
        governorate: 'القاهره',
        city: doc.neighborhood,
        latitude: lat,
        longitude: lng,
        priority: doc.priority,
        companyId: company.id,
      }
    });

    await prisma.doctorLocation.create({
      data: {
        doctorId: doctor.id,
        name: doc.clinic,
        address: `${doc.neighborhood}, القاهره`,
        latitude: lat,
        longitude: lng,
        isPrimary: true,
      }
    });

    for (const day of [1, 2, 3, 4]) {
      await prisma.doctorSchedule.create({
        data: { doctorId: doctor.id, dayOfWeek: day, startTime: '10:00', endTime: '16:00' }
      });
    }

    allDoctors.push(doctor);
  }

  console.log(`✅ تم انشاء الاطباء: ${allDoctors.length} (${DOCTORS_DATA.length} اسكندريه + ${MATROUH_DATA.length} مطروح + ${CAIRO_DATA.length} القاهره)`);

  const products = await Promise.all([
    prisma.product.create({ data: { name: 'كارديوفاسك', genericName: 'اتورفاستاتين كالسيوم', category: 'قلب والاوعيه', description: 'ادويه خفض الكوليسترول', dosageInfo: '10mg, 20mg, 40mg اقراص', companyId: company.id } }),
    prisma.product.create({ data: { name: 'نيوروفين', genericName: 'بريجابالين', category: 'الاعصاب', description: 'علاج الالم العصبي', dosageInfo: '75mg, 150mg كبسولات', companyId: company.id } }),
    prisma.product.create({ data: { name: 'اوستوفلكس', genericName: 'جرعه سلفات الجلوكوزامين', category: 'العظام', description: 'مكمل صحة المفاصل', dosageInfo: '500mg اقراص', companyId: company.id } }),
    prisma.product.create({ data: { name: 'بيدياكير', genericName: 'باراسيتامول + كلورفينيرامين', category: 'اطفال', description: 'علاج نزلات البرد والحمى للاطفال', dosageInfo: 'شراب 100ml', companyId: company.id } }),
    prisma.product.create({ data: { name: 'ديرماكلير', genericName: 'كلوتريمازول', category: 'الجلد', description: 'كريم مكافح للفطريات', dosageInfo: '1% كريم 20g', companyId: company.id } }),
    prisma.product.create({ data: { name: 'رينوكلير', genericName: 'فتيكازون بروبيونات', category: 'انف واذن وحنجره', description: 'رذاذ انفي لالتهاب الانف التحسسي', dosageInfo: '50mcg/نفخه', companyId: company.id } }),
    prisma.product.create({ data: { name: 'فيجن بلس', genericName: 'لوتين + زياكسانثين', category: 'العيون', description: 'مكمل صحة العيون', dosageInfo: '10mg كبسولات ناعمه', companyId: company.id } }),
    prisma.product.create({ data: { name: 'اوروڤيكس', genericName: 'تامسولوسين HCl', category: 'المسالك البوليه', description: 'علاج تضخم البروستاتا الحميد', dosageInfo: '0.4mg كبسولات', companyId: company.id } }),
  ]);

  console.log('✅ تم انشاء المنتجات:', products.length);

  const alexandriaDoctors = allDoctors.filter(d => d.governorate === 'اسكندريه');
  const repAssignments = [
    { rep: reps[0], doctors: alexandriaDoctors.slice(0, 18) },
    { rep: reps[1], doctors: alexandriaDoctors.slice(18, 36) },
    { rep: reps[2], doctors: alexandriaDoctors.slice(36).concat(allDoctors.filter(d => d.governorate !== 'اسكندريه')) },
  ];

  let assignmentCount = 0;
  for (const { rep, doctors } of repAssignments) {
    for (const doctor of doctors) {
      await prisma.repDoctor.create({
        data: {
          repId: rep.id,
          doctorId: doctor.id,
          interestLevel: [InterestLevel.HIGH, InterestLevel.MEDIUM, InterestLevel.LOW][Math.floor(Math.random() * 3)],
          notes: `تعيين الى ${rep.name}`
        }
      });
      assignmentCount++;
    }
  }
  console.log('✅ تعيينات الاطباء:', assignmentCount);

  const visitPurposes = [VisitPurpose.DETAILING, VisitPurpose.FOLLOW_UP, VisitPurpose.PRODUCT_LAUNCH, VisitPurpose.SAMPLE_DELIVERY, VisitPurpose.MEDICAL_EDUCATION, VisitPurpose.RELATIONSHIP_BUILDING];
  const visits = [];
  for (let i = 0; i < 25; i++) {
    const rep = reps[i % reps.length];
    const doctor = allDoctors[i % allDoctors.length];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Math.floor(Math.random() * 30));
    startDate.setHours(9 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 60), 0, 0);
    const endDate = new Date(startDate);
    endDate.setMinutes(endDate.getMinutes() + 15 + Math.floor(Math.random() * 20));

    const visit = await prisma.visit.create({
      data: {
        repId: rep.id, doctorId: doctor.id,
        visitPurpose: visitPurposes[i % visitPurposes.length],
        status: i < 20 ? VisitStatus.COMPLETED : VisitStatus.IN_PROGRESS,
        startTime: startDate, endTime: i < 20 ? endDate : null,
        duration: i < 20 ? Math.floor((endDate.getTime() - startDate.getTime()) / 60000) : null,
        latitude: doctor.latitude! + (Math.random() - 0.5) * 0.001,
        longitude: doctor.longitude! + (Math.random() - 0.5) * 0.001,
        distanceFromDoctor: Math.random() * 300,
        isVerified: i < 18,
        doctorResponse: i < 20 ? [DoctorResponse.VERY_INTERESTED, DoctorResponse.INTERESTED, DoctorResponse.NEUTRAL, DoctorResponse.NOT_INTERESTED][Math.floor(Math.random() * 4)] : null,
        notes: `ملاحظات زياره ${doctor.name}`,
        nextFollowUpDate: new Date(Date.now() + (3 + Math.floor(Math.random() * 14)) * 24 * 60 * 60 * 1000),
        nextFollowUpType: 'VISIT',
        nextFollowUpNotes: 'متابعه على رد فعل الدكتور',
        companyId: company.id,
      }
    });
    const selectedProducts = products.slice(0, 2 + Math.floor(Math.random() * 3));
    for (const product of selectedProducts) {
      await prisma.visitProduct.create({ data: { visitId: visit.id, productId: product.id } });
    }
    visits.push(visit);
  }
  console.log('✅ تم انشاء الزيارات:', visits.length);

  for (let i = 0; i < 15; i++) {
    const rep = reps[i % reps.length];
    const doctor = allDoctors[i % allDoctors.length];
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + Math.floor(Math.random() * 14));
    await prisma.followUp.create({
      data: {
        repId: rep.id, doctorId: doctor.id,
        visitId: i < 5 ? visits[i].id : null,
        dueDate,
        actionType: [FollowUpActionType.CALL, FollowUpActionType.VISIT, FollowUpActionType.SEND_INFO][i % 3],
        notes: `متابعه مع ${doctor.name}`,
        status: i < 4 ? FollowUpStatus.COMPLETED : FollowUpStatus.PENDING,
        completedAt: i < 4 ? new Date() : null,
        companyId: company.id,
      }
    });
  }
  console.log('✅ تم انشاء المتابعات');

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  for (const rep of reps) {
    await prisma.target.create({
      data: {
        repId: rep.id, month: currentMonth, year: currentYear,
        totalVisits: 60, totalDoctors: 20, newDoctors: 5, followUps: 25,
        companyId: company.id,
      }
    });
  }
  console.log('✅ تم انشاء الاهداف');

  for (const rep of reps) {
    await prisma.notification.create({
      data: { userId: rep.id, title: 'تذكير متابعه', message: 'لديك 3 متابعات مستحقة اليوم', type: NotificationType.FOLLOW_UP, isRead: false }
    });
  }
  console.log('✅ تم انشاء الاشعارات');

  console.log('\n🎉 تم الانتهاء من الادخال!');
  console.log(`\n📊 ملخص:`);
  console.log(`- الشركه: ${company.name}`);
  console.log(`- الادمن: admin@pharmavet.com`);
  console.log(`- المدير: manager@pharmavet.com`);
  console.log(`- المندوبين: ${reps.map(r => r.email).join(', ')}`);
  console.log(`- الاطباء: ${allDoctors.length} اجمالى`);
  console.log(`  - اسكندريه: ${DOCTORS_DATA.length}`);
  console.log(`  - مطروح: ${MATROUH_DATA.length}`);
  console.log(`  - القاهره: ${CAIRO_DATA.length}`);
  console.log(`- المنتجات: ${products.length}`);
  console.log(`- الزيارات: ${visits.length}`);
  console.log(`- كلمه المرور للجميع: password123`);
}

main()
  .catch((e) => { console.error('❌ خطأ:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
