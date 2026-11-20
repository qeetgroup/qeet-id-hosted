// "Not now" for SCIM, kept in this browser for one set-up link. The key holds the link's expiry,
// which tells one link from another without storing anything secret; a new link asks again.

const KEY = "qeetid.portal.scimSkipped";

export function readScimSkipped(linkExpiresAt: string): boolean {
  try {
    return window.localStorage.getItem(KEY) === linkExpiresAt;
  } catch {
    return false;
  }
}

export function writeScimSkipped(linkExpiresAt: string, skipped: boolean): void {
  try {
    if (skipped) window.localStorage.setItem(KEY, linkExpiresAt);
    else window.localStorage.removeItem(KEY);
  } catch {
    // Storage blocked: "Not now" lasts until the page is reloaded.
  }
}
