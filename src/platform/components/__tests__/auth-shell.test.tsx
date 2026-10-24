// @vitest-environment jsdom
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import "@/i18n";

import { render } from "@/testing/render";
import { AuthShell } from "../auth-shell";

afterEach(cleanup);

describe("AuthShell default brand panel", () => {
  it("names only what hosted sign-in offers, and claims no SSO or certification", () => {
    render(
      <AuthShell>
        <p>form</p>
      </AuthShell>,
    );

    expect(screen.getByText("Passkeys-first authentication")).toBeTruthy();
    expect(screen.getByText("Adaptive security")).toBeTruthy();
    expect(screen.getByText("One identity for all your apps")).toBeTruthy();
    expect(screen.queryByText(/SSO/i)).toBeNull();
    expect(screen.queryByText(/SOC ?2/i)).toBeNull();
  });
});
