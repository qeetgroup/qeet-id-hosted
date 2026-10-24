import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { open, PAGES } from "./pages";

// Every page meets WCAG 2.2 AA as far as axe can tell, in the state it renders without a
// backend — in both themes, since the theme follows the system setting by default.
for (const colorScheme of ["light", "dark"] as const) {
  test.describe(`${colorScheme} theme`, () => {
    test.use({ colorScheme });

    for (const path of PAGES) {
      test(`${path} has no WCAG 2.2 AA violations`, async ({ page }) => {
        await open(page, path);

        const { violations } = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
          .analyze();

        expect(
          violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`),
        ).toEqual([]);
      });
    }
  });
}
