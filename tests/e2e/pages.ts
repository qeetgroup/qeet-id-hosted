import { expect, type Page } from "@playwright/test";

/** Every page, with the query each needs to render past its "invalid link" state. */
export const PAGES = [
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password?token=t",
  "/magic-link?token=t",
  "/consent?request_id=r",
  "/device",
  "/sign-out?logout_confirmation=t",
  "/sign-out/done",
  "/security",
  "/enterprise-setup",
  "/no-such-page",
];

/** Opens a page and waits until Next.js's own scripts have run, so it has hydrated. */
export async function open(page: Page, path: string) {
  const response = await page.goto(path);
  await expect
    .poll(() => page.evaluate(() => typeof (window as unknown as { next?: unknown }).next))
    .toBe("object");
  await page.waitForLoadState("networkidle");
  return response;
}
