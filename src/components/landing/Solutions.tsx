"use client";

const I = ({ d }: { d: string }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const roles = [
  { title: "Medical Representatives", desc: "Know where you're going, who you're meeting, what needs follow-up, and how your day is progressing.", icon: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M22 21v-2a4 4 0 0 0-3-3.87" },
  { title: "Managers", desc: "See team activity, coverage, performance, schedules, and targets without chasing spreadsheets.", icon: "M3 3v18h18 M18 17V9 M13 17V5 M8 17v-3" },
  { title: "Administrators", desc: "Manage organizations, users, products, permissions, configuration, and operational visibility from one platform.", icon: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" },
];

export function Solutions() {
  return (
    <section id="solutions" className="py-24 bg-white scroll-mt-16">
      <div className="max-w-7xl mx-auto px-6">
        <div className="max-w-3xl mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/20 mb-6">
            <span className="text-xs font-semibold text-teal-700 tracking-wide uppercase">Solutions</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900">Built for Every Level of the Field Force.</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {roles.map((r, i) => (
            <div key={i} className="rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-8">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-teal-500 mb-5 flex items-center justify-center text-white">
                <I d={r.icon} />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">{r.title}</h3>
              <p className="text-slate-600 leading-relaxed">{r.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}