import { fileURLToPath, URL } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

/** Unit and component tests, independent of the Next.js build. */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    exclude: [...configDefaults.exclude, ".next/**", "tests/e2e/**"],
    setupFiles: ["./src/testing/setup.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/__tests__/**", "src/testing/**"],
      // A floor at today's coverage, so a change never lowers it. Raise these as
      // tests are added; never lower them to make a change pass.
      thresholds: { statements: 64, branches: 58, functions: 62, lines: 64 },
    },
  },
});
