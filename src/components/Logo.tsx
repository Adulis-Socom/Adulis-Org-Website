/**
 * The Adulis mark from the approved prototype: an "A" on a rounded brand
 * square. Colours come from tokens through `fill-*`/`stroke-*` utilities, so it
 * carries no raw colour and follows any palette change.
 *
 * Decorative by default. It always sits beside the visible word "Adulis", which
 * is the accessible name of the link around it; labelling the SVG as well made
 * the prototype's home link announce "Adulis Adulis".
 */
export function Logo({ className = 'h-7 w-7' }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 32 32" fill="none" className={`shrink-0 ${className}`}>
      <rect width="32" height="32" rx="8" className="fill-brand" />
      <path
        d="M9 23L16 9L23 23"
        className="stroke-on-brand"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M11.5 18.5H20.5" className="stroke-on-brand" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
