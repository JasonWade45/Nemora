const I = ({ d }: { d: string }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const icons = {
  users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
  steth: "M11 2v2 M5 2v2 M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1 M8 15v1a6 6 0 0 0 6 6h1a6 6 0 0 0 6-6v-1",
  calendar: "M8 2v4 M16 2v4 M3 10h18 M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
  pin: "M20 10c0 7-8 12-8 12s-8-5-8-12a8 8 0 0 1 16 0z M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  chart: "M3 3v18h18 M18 17V9 M13 17V5 M8 17v-3",
  brain: "M12 5a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0 2-5 3 3 0 0 0-2-5 3 3 0 0 0-3-3z M12 5v14",
};

const features = [
  { title: "Field Force", desc: "Give every representative a clearer view of the day ahead.", icon: icons.users },
  { title: "Doctor Intelligence", desc: "Organize professionals, specialties, workplaces, and priorities in one place.", icon: icons.steth },
  { title: "Visit Management", desc: "Plan, execute, verify, and track every field visit.", icon: icons.calendar },
  { title: "Location Intelligence", desc: "Use real-time location data and geographic insight to work smarter.", icon: icons.pin },
  { title: "Performance", desc: "Turn activity into measurable KPIs, targets, and actionable insights.", icon: icons.chart },
  { title: "AI Assistance", desc: "Summaries, recommendations, and clearer decisions — alongside your team.", icon: icons.brain },
];

export function Features() {
  return (
    <section id="platform" className="py-24 bg-white scroll-mt-16">
      <div className="max-w-7xl mx-auto px-6">
        <div className="max-w-3xl mb-16">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900">Everything Your Field Team Needs. In One Place.</h2>
          <p className="mt-4 text-lg text-slate-600">A connected workspace for healthcare field operations, professionals, visits, and performance.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div key={i} className="group rounded-2xl border border-slate-200 bg-white p-8 hover:border-sky-300 hover:shadow-lg hover:shadow-sky-500/5 transition-all">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-teal-500 mb-5 flex items-center justify-center text-white">
                <I d={f.icon} />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">{f.title}</h3>
              <p className="text-slate-600 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
