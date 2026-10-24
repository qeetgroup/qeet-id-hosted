import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { SRC_DIR, sourceFiles } from "@/testing/source-files";

// Every key the code names exists in the English catalogue, so a typo or a
// removed string fails here instead of showing a raw key on screen. A key built
// at runtime (t(`errors.${code}`)) can't be checked this way; it carries a
// defaultValue instead.

const LOCALES = fileURLToPath(new URL("../locales/en", import.meta.url));
type Catalogue = { [key: string]: string | Catalogue };
const catalogue: Record<string, Catalogue> = Object.fromEntries(
  readdirSync(LOCALES)
    .filter((f) => f.endsWith(".json"))
    .map((f) => [f.replace(/\.json$/, ""), JSON.parse(readFileSync(join(LOCALES, f), "utf8"))]),
);

// A key holds a string, or plural forms (key_one, key_other) for a count.
function holds(ns: string, key: string): boolean {
  const parts = key.split(".");
  const leaf = parts.pop() as string;
  let node: string | Catalogue | undefined = catalogue[ns];
  for (const part of parts) node = typeof node === "object" ? node[part] : undefined;
  if (typeof node !== "object") return false;
  return typeof node[leaf] === "string" || typeof node[`${leaf}_other`] === "string";
}

const files = sourceFiles(SRC_DIR, { withTests: false }).map((file) => ({
  name: relative(SRC_DIR, file),
  text: readFileSync(file, "utf8"),
}));

describe("translation keys", () => {
  it("name only namespaces the catalogue has", () => {
    const unknown = files.flatMap(({ name, text }) =>
      [...text.matchAll(/useTranslation\("([A-Za-z]+)"\)/g)]
        .filter(([, ns]) => !(ns in catalogue))
        .map(([, ns]) => `${name}: ${ns}`),
    );
    expect(unknown).toEqual([]);
  });

  it("are all in the English catalogue", () => {
    const missing = files.flatMap(({ name, text }) => {
      const own = [...text.matchAll(/useTranslation\("([A-Za-z]+)"\)/g)].map(([, ns]) => ns);
      return [...text.matchAll(/\bt\("([^"]+)"/g)]
        .map(([, key]) => key)
        .filter((key) => {
          const [ns, rest] = key.includes(":") ? key.split(":", 2) : [undefined, key];
          // A file that names no namespace can only be checked for prefixed keys.
          const namespaces = ns ? [ns] : own;
          return namespaces.length > 0 && !namespaces.some((n) => holds(n, rest));
        })
        .map((key) => `${name}: ${key}`);
    });
    expect(missing).toEqual([]);
  });
});
