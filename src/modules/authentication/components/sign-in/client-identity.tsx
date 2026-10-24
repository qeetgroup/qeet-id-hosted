import { useState } from "react";

type ClientIdentityProps = {
  name: string;
  logoUri?: string;
  uri?: string;
};

// The server accepts only https for both; anything else is not rendered here either.
function httpsUrl(value?: string): URL | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url : undefined;
  } catch {
    return undefined;
  }
}

/**
 * The application being signed in to: its logo (a monogram tile when it has none, or the logo
 * fails to load), its name, and the host of its home page as text — "Acme Notes · acme.com".
 */
export function ClientIdentity({ name, logoUri, uri }: ClientIdentityProps) {
  const [logoFailed, setLogoFailed] = useState(false);
  const logo = logoFailed ? undefined : httpsUrl(logoUri);
  const site = httpsUrl(uri)?.hostname.replace(/^www\./, "");
  const initial = Array.from(name.trim())[0]?.toUpperCase() ?? "";
  return (
    <div className="flex items-center gap-3.5">
      {logo ? (
        // A white tile in both themes, as Google and Slack show third-party logos: an
        // application's artwork is drawn for a light background and can vanish on a dark one.
        // biome-ignore lint/performance/noImgElement: application logos load from any host
        <img
          src={logo.href}
          alt=""
          onError={() => setLogoFailed(true)}
          className="ring-border size-12 shrink-0 rounded-xl bg-white object-contain p-1.5 ring-1"
        />
      ) : (
        <span
          aria-hidden
          className="bg-brand-subtle text-brand-display ring-border-brand/30 grid size-12 shrink-0 place-items-center rounded-xl text-lg font-semibold ring-1"
        >
          {initial}
        </span>
      )}
      <p className="font-medium">
        {name}
        {site ? <span className="text-muted-foreground font-normal"> · {site}</span> : null}
      </p>
    </div>
  );
}
