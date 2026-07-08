export default function Logo({ className }) {
  return (
    <svg viewBox="0 0 110 100" className={className} aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeLinecap="round">
        <circle cx="48" cy="50" r="40" strokeWidth="6" pathLength="100"
          strokeDasharray="86 14" transform="rotate(18 48 50)" />
        <circle cx="48" cy="50" r="31" strokeWidth="5.5" pathLength="100"
          strokeDasharray="38 10 40 12" transform="rotate(-30 48 50)" />
      </g>
      <rect x="93" y="57" width="5" height="25" rx="1" fill="#d92b1f" />
    </svg>
  )
}
