export function About() {
  return (
    <section id="about" className="py-24 bg-slate-50 scroll-mt-16">
      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-start">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/20 mb-6">
            <span className="text-xs font-semibold text-sky-700 tracking-wide uppercase">About NEMORA</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 leading-tight">
            Every Visit Creates Information.<br />
            <span className="text-sky-600">NEMORA Turns It Into Intelligence.</span>
          </h2>
          <p className="mt-6 text-lg text-slate-600 leading-relaxed">
            Healthcare field teams generate valuable information every day — every doctor interaction, every visit, every location, every follow-up, every product discussion.
          </p>
          <p className="mt-4 text-lg text-slate-600 leading-relaxed">
            But this information is often fragmented across spreadsheets, messaging apps, disconnected CRMs, maps, and manual reports. NEMORA brings those pieces together into one connected workspace.
          </p>
          <p className="mt-4 text-lg text-slate-600 leading-relaxed">
            We transform field activity into structured intelligence so medical representatives can work more efficiently, managers can understand team performance, and organizations can make better decisions.
          </p>
        </div>
        <div className="space-y-6">
          <div className="rounded-2xl bg-white border border-slate-200 p-8">
            <h3 className="text-xl font-semibold text-slate-900 mb-3">Our Mission</h3>
            <p className="text-slate-600 leading-relaxed">To make healthcare field operations smarter, clearer, and more connected — so every visit leads to better decisions.</p>
          </div>
          <div className="rounded-2xl bg-white border border-slate-200 p-8">
            <h3 className="text-xl font-semibold text-slate-900 mb-3">What We Build</h3>
            <p className="text-slate-600 leading-relaxed">A healthcare field intelligence platform for pharmaceutical organizations — combining CRM, field force management, location intelligence, and performance analytics in one system.</p>
          </div>
          <div className="rounded-2xl bg-slate-900 p-8 text-white">
            <h3 className="text-xl font-semibold mb-3">What We Value</h3>
            <ul className="space-y-2 text-slate-300">
              <li>• Trust in healthcare operations</li>
              <li>• Clarity over complexity</li>
              <li>• Real-world field workflows</li>
              <li>• Enterprise-grade architecture</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
