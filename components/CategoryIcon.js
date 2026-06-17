/**
 * CategoryIcon.js
 * Inline SVG icon set for product categories — replaces emoji (👑⚔️🪄✨🗝️🎒)
 * so icons stay crisp at any size and inherit color via currentColor.
 * Unknown/future category slugs (added later via admin) fall back to a
 * generic tag icon rather than breaking or requiring an update here.
 */
const PATHS = {
  all: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/>
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/>
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/>
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>
    </>
  ),
  rank: (
    <path d="M4 19h16l1-10-5 4-4-9-4 9-5-4z"/>
  ),
  weapon: (
    <>
      <path d="M19 5L9 15"/>
      <path d="M7 13l4 4"/>
      <path d="M11 17l3 3"/>
      <path d="M16 3l2 2"/>
    </>
  ),
  sellwand: (
    <>
      <path d="M5 19L17 7"/>
      <path d="M15 3l1 2 2 1-2 1-1 2-1-2-2-1 2-1z"/>
      <path d="M20.5 9.5l.5 1 1 .5-1 .5-.5 1-.5-1-1-.5 1-.5z"/>
    </>
  ),
  auraskills: (
    <path d="M12 2.5l2.1 6 6 2.1-6 2.1-2.1 6-2.1-6-6-2.1 6-2.1z"/>
  ),
  'crate-key': (
    <>
      <circle cx="8" cy="8" r="3.4"/>
      <path d="M10.4 10.4L19.5 19.5"/>
      <path d="M15.5 15.5l1.8-1.8M17.8 17.8l1.8-1.8"/>
    </>
  ),

  kit: (
    <>
      <path d="M8 8.5V6.2a4 4 0 018 0V8.5"/>
      <rect x="5" y="8.5" width="14" height="12.5" rx="2.2"/>
      <path d="M9.5 13h5"/>
    </>
  ),
  default: (
    <>
      <path d="M3.5 7.5L12 3.5l8.5 4-8.5 4-8.5-4z"/>
      <path d="M3.5 7.5v9l8.5 4 8.5-4v-9"/>
      <path d="M12 11.5v9"/>
    </>
  ),
};

export default function CategoryIcon({ slug, size = 14, strokeWidth = 1.8, style = {} }) {
  const content = PATHS[slug] || PATHS.default;
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: 'block', flexShrink: 0, ...style }}
    >
      {content}
    </svg>
  );
}
