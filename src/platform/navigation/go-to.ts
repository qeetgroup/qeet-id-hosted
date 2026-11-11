// Full-page navigation away from a hosted-login form, kept in one place so
// tests can see where a flow sends the browser (jsdom cannot navigate).
// Callers pass a destination already checked with safeReturnTo, a local page, or a sign-in route
// of the API's own.
export function goTo(url: string): void {
  window.location.href = url;
}
