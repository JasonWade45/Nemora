export function FinalCTA() {
  return (
    <section id="get-started" className="py-24 bg-slate-900 relative overflow-hidden scroll-mt-16">
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-sky-500 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-teal-500 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2" />
      </div>
      <div className="relative max-w-4xl mx-auto px-6 text-center">
        <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white">Build a Smarter Field Force.</h2>
        <p className="mt-6 text-lg text-slate-300 max-w-2xl mx-auto">Bring your healthcare field operations, professionals, visits, locations, and performance into one connected platform.</p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <a href="/login" className="inline-flex items-center px-6 py-3 rounded-full bg-white text-slate-900 font-medium hover:bg-slate-100 transition">Get Started</a>
          <a href="#contact" className="inline-flex items-center px-6 py-3 rounded-full border border-white/30 text-white font-medium hover:bg-white/10 transition">Talk to NEMORA</a>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer id="contact" className="bg-slate-950 text-slate-400 py-16 scroll-mt-16">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-3 gap-10 mb-10">
          <div>
            <div className="text-white font-bold text-xl tracking-tight mb-3">NEMORA</div>
            <p className="text-sm leading-relaxed">Healthcare Field Intelligence. One connected workspace for modern healthcare field teams.</p>
          </div>
          <div>
            <div className="text-white font-semibold text-sm mb-4 uppercase tracking-wide">Contact</div>
            <ul className="text-sm space-y-2">
              <li><a href="mailto:hello@nemora.health" className="hover:text-white transition">hello@nemora.health</a></li>
              <li><a href="mailto:sales@nemora.health" className="hover:text-white transition">sales@nemora.health</a></li>
            </ul>
          </div>
          <div>
            <div className="text-white font-semibold text-sm mb-4 uppercase tracking-wide">Platform</div>
            <ul className="text-sm space-y-2">
              <li><a href="#platform" className="hover:text-white transition">Features</a></li>
              <li><a href="#about" className="hover:text-white transition">About</a></li>
              <li><a href="#security" className="hover:text-white transition">Security</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-800 pt-6 text-center text-xs">
          © 2026 NEMORA. Healthcare Field Intelligence. All rights reserved.
        </div>
      </div>
    </footer>
  );
}