export function Hero() {
  return (
    <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden">
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-br from-sky-100 to-transparent rounded-full blur-3xl opacity-60 translate-x-1/3 -translate-y-1/3" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-teal-100 to-transparent rounded-full blur-3xl opacity-40 -translate-x-1/3 translate-y-1/3" />
      </div>
      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/20 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse-dot" />
            <span className="text-xs font-semibold text-sky-700 tracking-wide uppercase">Healthcare Field Intelligence</span>
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-slate-900 leading-[1.05]">
            Smarter Fieldwork.
            <br />
            <span className="bg-gradient-to-r from-sky-500 to-teal-500 bg-clip-text text-transparent">Stronger Healthcare.</span>
          </h1>
          <p className="mt-6 text-lg text-slate-600 max-w-xl leading-relaxed">
            NEMORA gives healthcare organizations one intelligent platform to manage field teams, professionals, visits, schedules, locations, follow-ups, and performance — all in one connected workspace.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <a href="#get-started" className="inline-flex items-center px-6 py-3 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-medium transition shadow-lg">
              Get Started
            </a>
            <a href="#platform" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white hover:bg-slate-50 text-slate-900 font-medium border border-slate-200 transition">
              Explore Platform
            </a>
          </div>
          <p className="mt-8 text-sm text-slate-500">One connected workspace for the modern healthcare field force.</p>
        </div>
        <div className="relative h-[500px] lg:h-[600px]">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-sky-500 to-teal-500 p-1 shadow-2xl shadow-sky-500/20">
            <div className="w-full h-full rounded-[22px] bg-white p-6 flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-teal-500" />
                  <div className="h-3 w-20 bg-slate-200 rounded-full" />
                </div>
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-slate-300" />
                  <div className="w-2 h-2 rounded-full bg-slate-300" />
                  <div className="w-2 h-2 rounded-full bg-slate-300" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="rounded-xl bg-sky-50 p-3"><div className="text-xs text-slate-500 mb-1">Visits</div><div className="text-lg font-bold text-slate-900">12</div></div>
                <div className="rounded-xl bg-teal-50 p-3"><div className="text-xs text-slate-500 mb-1">Doctors</div><div className="text-lg font-bold text-slate-900">48</div></div>
                <div className="rounded-xl bg-sky-50 p-3"><div className="text-xs text-slate-500 mb-1">Coverage</div><div className="text-lg font-bold text-slate-900">87%</div></div>
              </div>
              <div className="flex-1 rounded-xl bg-gradient-to-b from-sky-50 to-white border border-slate-100 p-4 flex flex-col">
                <div className="text-xs font-medium text-slate-500 mb-3">Field activity</div>
                <div className="flex items-end gap-2 flex-1">
                  {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                    <div key={i} className="flex-1 rounded-t-md bg-gradient-to-t from-sky-500 to-teal-500" style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="absolute -left-4 top-12 bg-white rounded-2xl shadow-xl p-4 flex items-center gap-3 animate-float">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-500 to-teal-500 flex items-center justify-center text-white font-bold">✓</div>
            <div>
              <div className="text-sm font-bold text-slate-900">GPS Verified</div>
              <div className="text-xs text-slate-500">Check-in active</div>
            </div>
          </div>
          <div className="absolute -right-4 bottom-16 bg-white rounded-2xl shadow-xl p-4 flex items-center gap-3 animate-float" style={{ animationDelay: "1s" }}>
            <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse-dot" />
            <div>
              <div className="text-sm font-bold text-slate-900">Live Field Activity</div>
              <div className="text-xs text-slate-500">Tracking enabled</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
