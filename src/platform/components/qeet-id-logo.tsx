import { useId } from "react";

/**
 * Qeet ID's lockup on the web: the Qeet ID icon (the keyhole on Qeet orange, the same mark as the
 * Android and iOS apps) as a rounded square, then the name with the display letterforms. Sizes
 * follow the website's header: a 26 px icon, a 10 px gap and a 19 px name; other sizes keep the
 * proportions. The icon is decorative; the name says it. Its colours are the logo's, not the UI's,
 * so they are not tokens.
 */
export function QeetIdLogo({ size = 26, className }: { size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center ${className ?? ""}`} style={{ gap: size * 0.385 }}>
      <QeetIdMark size={size} />
      <span
        className="font-semibold whitespace-nowrap text-text-default"
        style={{
          fontSize: size * 0.73,
          lineHeight: 1,
          fontVariationSettings: '"GEOM" var(--qx-font-geometry-display)',
        }}
      >
        Qeet ID
      </span>
    </span>
  );
}

/** The Qeet ID icon alone: a white disc with a keyhole cut out, on the Qeet orange gradient. */
export function QeetIdMark({ size }: { size: number }) {
  const id = `qid-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden className="shrink-0">
      <defs>
        <linearGradient id={id} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor="#DA653A" />
          <stop offset="0.45" stopColor="#D04800" />
          <stop offset="1" stopColor="#9B3314" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="22.5" fill={`url(#${id})`} />
      <path
        d="M21 50a29 29 0 1 0 58 0a29 29 0 1 0-58 0ZM46.2 50.6L43.5 64.5H56.5L53.8 50.6A8.5 8.5 0 1 0 46.2 50.6Z"
        fill="#FFFFFF"
        fillRule="evenodd"
      />
    </svg>
  );
}
