export default function Logo({ className }) {
  return (
    <svg viewBox="0 0 110 100" className={className} aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeLinecap="round">
        <circle cx="48" cy="50" r="40" strokeWidth="6" pathLength="100"
          strokeDasharray="86 14" transform="rotate(18 48 50)" />
        <circle cx="48" cy="50" r="31" strokeWidth="5.5" pathLength="100"
          strokeDasharray="38 10 40 12" transform="rotate(-30 48 50)" />
      </g>
      {/* The mark's one red element takes the theme's accent rather than a
          literal of its own: the light red was retuned to #c9261b for contrast
          and dark lifts it to #f0554a, and a hardcoded #d92b1f matched neither.
          A token here also means the mark is the same red as the period after
          the name it sits beside in the island. */}
      <rect x="93" y="57" width="5" height="25" rx="1" fill="var(--color-accent)" />
    </svg>
  )
}
