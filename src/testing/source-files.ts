import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/** The repository's src/ folder, for tests that read the source itself. */
export const SRC_DIR = fileURLToPath(new URL("..", import.meta.url));

/** Every .ts and .tsx file under dir; withTests: false leaves out __tests__ folders. */
export function sourceFiles(dir = SRC_DIR, { withTests = true } = {}): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      return !withTests && name === "__tests__" ? [] : sourceFiles(path, { withTests });
    }
    return /\.tsx?$/.test(name) ? [path] : [];
  });
}
