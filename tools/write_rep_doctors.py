import pathlib

root = pathlib.Path(r"C:\Users\ATG\Documents\Default Project\pharma-crm\src\app\rep\my-doctors")
root.mkdir(parents=True, exist_ok=True)

page = r'''"use client";

import { useEffect, useMemo, useState } from "react";
import { Doctor, apiFetch, buildMapsUrl, doctorDisplayName, getAllDoctors } from "@/lib/api";
import { Icon, icons } from "@/components/ui/Icons";

function initials(name: string) {
  const parts = name.replace(/^(د\.?|د\/|دكتور|دكتورة|Dr\.?|Doctor)\s*/i, "").split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2);
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function MyDoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [mySpecs, setMySpecs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [me, all] = await Promise.all([
          apiFetch<any>("/api/auth/me").catch(() => null),
          getAllDoctors().catch(() => []),
        ]);
        setMySpecs(me?.specialties ?? []);
        setDoctors(all);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    let list = doctors;
    // Filter by rep specialties (if any assigned)
    if (mySpecs.length > 0) {
      list = list.filter((d) => d.specialty && mySpecs.includes(d.specialty));
    }
    // Search
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (d) =>
          doctorDisplayName(d).toLowerCase().includes(q) ||
          (d.specialty ?? "").toLowerCase().includes(q) ||
          (d.phone ?? "").toLowerCase().includes(q) ||
          (d.address ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [doctors, mySpecs, search]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">أطبائي</h1>
        <p className="text-sm text-slate-600 mt-0.5">
          {loading
            ? "جاري التحميل..."
            : mySpecs.length > 0
            ? `${mySpecs.join(" · ")} — ${filtered.length} طبيب`
            : `كل الأطباء — ${filtered.length}`}
        </p>
      </div>

      {mySpecs.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {mySpecs.map((s) => (
            <span
              key={s}
              className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-teal-50 text-teal-700 border border-teal-100"
            >
              {s}
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <span className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400">
          <Icon d={icons.search} size={16} />
        </span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث بالاسم أو التخصص أو الهاتف..."
          className="w-full ps-9 pe-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition"
        />
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-white border border-slate-200 p-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-slate-100 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-40 bg-slate-100 rounded animate-pulse" />
                  <div className="h-3 w-24 bg-slate-100 rounded animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl bg-white border border-slate-200 p-10 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
            <Icon d={icons.doctors} size={22} />
          </div>
          <div className="text-sm font-medium text-slate-900 mb-1">
            {search ? "لا توجد نتائج" : "لا يوجد أطباء"}
          </div>
          <p className="text-xs text-slate-500">
            {search ? "جرّب تعديل البحث" : "تواصل مع الأدمن لإضافة تخصصات لك"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((d) => {
            const name = doctorDisplayName(d);
            const mapsUrl = buildMapsUrl(d);
            return (
              <div key={d.id} className="rounded-2xl bg-white border border-slate-200 p-4">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-sky-500 to-teal-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
                    {initials(name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-900 truncate leading-tight">
                      {name}
                    </div>
                    {d.specialty && (
                      <div className="text-[11px] text-slate-500 mt-0.5">{d.specialty}</div>
                    )}
                    <div className="mt-2 space-y-1 text-xs text-slate-600">
                      {d.phone && (
                        <a href={`tel:${d.phone}`} className="flex items-center gap-1.5 hover:text-sky-600">
                          <Icon d={icons.phone} size={12} />
                          <span dir="ltr" className="tabular-nums">{d.phone}</span>
                        </a>
                      )}
                      {d.address && (
                        <div className="flex items-start gap-1.5">
                          <span className="text-slate-400 mt-0.5 shrink-0"><Icon d={icons.pin} size={12} /></span>
                          <span className="line-clamp-2 leading-snug">{d.address}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-gradient-to-r from-sky-500 to-teal-500 text-white text-xs font-medium hover:from-sky-600 hover:to-teal-600 transition"
                  >
                    <Icon d={icons.navigation} size={13} />
                    وصّلني
                  </a>
                  {d.phone && (
                    <a
                      href={`tel:${d.phone}`}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-50 transition"
                    >
                      <Icon d={icons.phone} size={13} />
                      اتصال
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
'''
(root / "page.tsx").write_text(page, encoding="utf-8")
print("OK - /rep/my-doctors page created")