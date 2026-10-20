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
    exclude: [...configDefaults.exclude, ".next/**"],
    setupFiles: ["./src/test-setup.ts"],
  },
});
