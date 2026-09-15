"use client";

function Logo() {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
      <defs>
        <linearGradient id="ng" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0EA5E9" />
          <stop offset="100%" stopColor="#14B8A6" />
        </linearGradient>
      </defs>
      <path d="M6 24V8L16 18L26 8V24" stroke="url(#ng)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="6" cy="8" r="2.5" fill="#0EA5E9" />
      <circle cx="26" cy="8" r="2.5" fill="#14B8A6" />
      <circle cx="16" cy="18" r="2.5" fill="#0A1628" />
    </svg>
  );
}

const links = [
  { href: "#platform", label: "Platform" },
  { href: "#about", label: "About" },
  { href: "#solutions", label: "Solutions" },
  { href: "#ai", label: "AI" },
  { href: "#security", label: "Security" },
];

export function Navbar() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/60">
      <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2">
          <Logo />
          <span className="text-xl font-bold tracking-tight text-slate-900">NEMORA</span>
        </a>
        <div className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-sm font-medium text-slate-600 hover:text-slate-900 transition">
              {l.label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <a href="/login" className="hidden sm:inline-flex text-sm font-medium text-slate-600 hover:text-slate-900 transition">Sign in</a>
          <a href="/login" className="inline-flex items-center px-4 py-2 rounded-full bg-sky-500 hover:bg-sky-600 text-white text-sm font-medium transition shadow-sm">Get Started</a>
        </div>
      </nav>
    </header>
  );
}