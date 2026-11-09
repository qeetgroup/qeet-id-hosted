// @vitest-environment jsdom
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import "@/i18n";

import { render } from "@/testing/render";
import { PasswordRules, passwordRules } from "../password-rules";

afterEach(cleanup);

const POLICY = {
  min_length: 12,
  require_uppercase: true,
  require_number: true,
  require_symbol: false,
};

describe("PasswordRules", () => {
  it("lists only the organisation's rules, each met or not", () => {
    expect(passwordRules(POLICY, "brightleaf2026").map((r) => [r.id, r.met])).toEqual([
      ["length", true],
      ["uppercase", false],
      ["number", true],
    ]);
    expect(passwordRules({ ...POLICY, require_symbol: true }, "Brightleaf!26x").at(-1)).toEqual({
      id: "symbol",
      met: true,
    });
  });

  it("says each rule in words, never by colour alone", () => {
    render(<PasswordRules policy={POLICY} password="Brightleaf" />);

    expect(screen.getByText("At least 12 characters")).toBeTruthy();
    expect(screen.getByText("An uppercase letter")).toBeTruthy();
    expect(screen.getAllByText(/\(not met yet\)/)).toHaveLength(2);
    expect(screen.getAllByText(/\(met\)/)).toHaveLength(1);
  });
});
