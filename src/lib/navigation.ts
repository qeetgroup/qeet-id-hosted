// Full-page navigation away from a hosted-login form, kept in one place so
// tests can see where a flow sends the browser (jsdom cannot navigate).
// Callers pass a destination already checked with safeReturnTo, or a local page.
export function goTo(url: string): void {
  window.location.href = url;
}
