// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import "@/i18n";

import { AuthShell } from "./auth-shell";

afterEach(cleanup);

describe("AuthShell default brand panel", () => {
  it("names only what hosted sign-in offers, and claims no SSO or certification", () => {
    render(
      <AuthShell>
        <p>form</p>
      </AuthShell>,
    );

    expect(screen.getByText("Passkeys")).toBeTruthy();
    expect(screen.getByText("Adaptive MFA")).toBeTruthy();
    expect(screen.queryByText(/SSO/i)).toBeNull();
    expect(screen.queryByText(/SOC ?2/i)).toBeNull();
  });
});
