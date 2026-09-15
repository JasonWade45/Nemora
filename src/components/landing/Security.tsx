export function Security() {
  const items = [
    "Role-based access control",
    "Organization-level data isolation",
    "Secure authentication with JWT",
    "Server-side authorization",
    "Audit logging",
    "PostgreSQL + PostGIS foundation",
    "Modular backend architecture",
    "Provider-agnostic integrations",
  ];
  return (
    <section id="security" className="py-24 bg-white scroll-mt-16">
      <div className="max-w-7xl mx-auto px-6">
        <div className="max-w-3xl mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-500/10 border border-slate-500/20 mb-6">
            <span className="text-xs font-semibold text-slate-700 tracking-wide uppercase">Security</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900">Built for Organizations That Take Data Seriously.</h2>
          <p className="mt-4 text-lg text-slate-600">Designed with enterprise security principles.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {items.map((t, i) => (
            <div key={i} className="rounded-xl border border-slate-200 bg-slate-50 p-5 flex items-start gap-3">
              <span className="w-2 h-2 rounded-full bg-teal-500 mt-2 flex-shrink-0" />
              <span className="text-sm font-medium text-slate-700">{t}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
