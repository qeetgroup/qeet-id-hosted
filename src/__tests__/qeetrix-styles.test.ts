import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

import { SRC_DIR, sourceFiles } from "@/testing/source-files";

// globals.css imports the CSS of exactly the Qeetrix components the pages use, to keep every
// page light. A component used without its file renders unstyled with no error anywhere, so this
// test finds each one the code imports and checks its file is there.

const DIST = join(SRC_DIR, "..", "node_modules", "@qeetrix", "react", "dist");
const GLOBALS = readFileSync(join(SRC_DIR, "app", "globals.css"), "utf8");

/** Each exported component's folder in the package (Button → button, MenuContent → menu). */
function componentFolders(entry: "" | "experimental"): Map<string, string> {
  const root = join(DIST, entry);
  const folders = new Map<string, string>();
  for (const folder of readdirSync(root)) {
    const index = join(root, folder, "index.d.ts");
    if (!existsSync(index)) continue;
    for (const [, names] of readFileSync(index, "utf8").matchAll(/export \{([^}]*)\}/g)) {
      for (const name of (names ?? "").split(",")) {
        const id = name.trim();
        if (/^[A-Z]/.test(id)) folders.set(id, folder);
      }
    }
  }
  return folders;
}

const ENTRIES = {
  "@qeetrix/react": { folders: componentFolders(""), css: "@qeetrix/react/css/" },
  "@qeetrix/react/experimental": {
    folders: componentFolders("experimental"),
    css: "@qeetrix/react/css/experimental/",
  },
} as const;

describe("Qeetrix styles", () => {
  it("are imported for every component the code uses", () => {
    const missing = new Set<string>();
    for (const file of sourceFiles(SRC_DIR, { withTests: false })) {
      const source = readFileSync(file, "utf8");
      for (const [, names, from] of source.matchAll(
        /import \{([^}]*)\} from "(@qeetrix\/react[^"]*)"/g,
      )) {
        const entry = ENTRIES[from as keyof typeof ENTRIES];
        if (!entry) continue;
        for (const raw of (names ?? "").split(",")) {
          const name =
            raw
              .replace(/^\s*type\s+/, "")
              .split(" as ")[0]
              ?.trim() ?? "";
          const folder = entry.folders.get(name);
          if (!folder) continue;
          const cssFile = join(
            DIST,
            "css",
            from?.endsWith("experimental") ? "experimental" : "",
            `${folder}.css`,
          );
          if (existsSync(cssFile) && !GLOBALS.includes(`"${entry.css}${folder}.css"`)) {
            missing.add(`${entry.css}${folder}.css (${name}, ${relative(SRC_DIR, file)})`);
          }
        }
      }
    }
    expect([...missing]).toEqual([]);
  });
});
