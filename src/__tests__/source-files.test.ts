import { readFileSync } from "node:fs";
import { relative } from "node:path";
import { describe, expect, it } from "vitest";

import { SRC_DIR, sourceFiles } from "@/testing/source-files";

// Small enough to read in one sitting. Split a longer file by cohesion into
// siblings named after their part; never raise the limit to make room.
const MAX_LINES = 500;

// The types generated from the server's API documents are written by `bun run contract:sync`,
// never by hand, so they are as long as the documents.
const GENERATED = /[\\/]platform[\\/]api[\\/]contract[\\/]generated[\\/]/;

describe("source files", () => {
  it(`stay within ${MAX_LINES} lines`, () => {
    const over = sourceFiles()
      .filter((file) => !GENERATED.test(file))
      .map(
        (file) => [relative(SRC_DIR, file), readFileSync(file, "utf8").split("\n").length] as const,
      )
      .filter(([, lines]) => lines > MAX_LINES);
    expect(over).toEqual([]);
  });
});
