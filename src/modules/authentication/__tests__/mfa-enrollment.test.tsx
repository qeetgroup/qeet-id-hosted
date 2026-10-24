// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import "@/i18n";

import { mockApi } from "@/testing/mock-api";
import { MfaEnrollment } from "../components/mfa/mfa-enrollment";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("MfaEnrollment", () => {
  it("starts authenticator-app setup and shows the key to enter", async () => {
    mockApi({
      "POST /v1/auth/mfa/enroll": {
        status: 200,
        body: {
          secret: "JBSWY3DPEHPK3PXP",
          provisioning_url: "otpauth://totp/Qeet:ada?secret=JBSWY3DPEHPK3PXP",
        },
      },
    });
    render(<MfaEnrollment mfaToken="mfa-1" onDone={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Set up an authenticator app" }));

    expect(await screen.findByText("Setup key")).toBeTruthy();
    expect(screen.getByText(/JBSWY3DPEHPK3PXP/)).toBeTruthy();
  });

  it("lets the person skip while the organisation's grace period lasts", async () => {
    const calls = mockApi({ "POST /v1/auth/session/mfa": { status: 200, body: {} } });
    const onDone = vi.fn();
    render(<MfaEnrollment mfaToken="mfa-1" dueAt="2026-12-01T00:00:00Z" onDone={onDone} />);

    fireEvent.click(screen.getByRole("button", { name: "Skip for now" }));

    await waitFor(() => expect(onDone).toHaveBeenCalledOnce());
    expect(calls[0].body).toEqual({ mfa_token: "mfa-1", skip: true });
  });
});
