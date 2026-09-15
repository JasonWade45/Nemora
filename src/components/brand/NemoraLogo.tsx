export function NemoraLogo({ size = 28, dark = false }: { size?: number; dark?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <defs>
        <linearGradient id="ng-dash" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0EA5E9" />
          <stop offset="100%" stopColor="#14B8A6" />
        </linearGradient>
      </defs>
      <path d="M6 24V8L16 18L26 8V24" stroke="url(#ng-dash)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="6" cy="8" r="2.5" fill="#0EA5E9" />
      <circle cx="26" cy="8" r="2.5" fill="#14B8A6" />
      <circle cx="16" cy="18" r="2.5" fill={dark ? "#FFFFFF" : "#0A1628"} />
    </svg>
  );
}