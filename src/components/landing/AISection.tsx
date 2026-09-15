export function AISection() {
  return (
    <section id="ai" className="py-24 bg-slate-900 text-white relative overflow-hidden scroll-mt-16">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-sky-500 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
      </div>
      <div className="relative max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-500/20 border border-sky-500/30 mb-6">
            <span className="text-xs font-semibold text-sky-300 tracking-wide uppercase">AI Layer</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight">AI That Works With Your Field Data.</h2>
          <p className="mt-6 text-lg text-slate-300 leading-relaxed">
            NEMORA's AI layer helps teams summarize visits, understand performance, organize follow-ups, and surface useful insights from the information already inside the platform.
          </p>
          <p className="mt-4 text-slate-400 leading-relaxed">
            Designed to assist with CRM and operational intelligence — never medical diagnosis, never invented healthcare facts.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {["Visit summaries", "Follow-up suggestions", "KPI explanations", "CRM search", "Report summaries", "Productivity insights"].map((t, i) => (
            <div key={i} className="rounded-xl bg-white/5 border border-white/10 p-4 text-sm font-medium backdrop-blur">
              {t}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
