// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import "@/i18n";

import { mockApi } from "@/testing/mock-api";
import { render } from "@/testing/render";
import { MfaEnrollment } from "../components/mfa/mfa-enrollment";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("MfaEnrollment", () => {
  it("sets up an authenticator app: the code to scan, the key in groups, and Open on a phone", async () => {
    mockApi({
      "POST /v1/auth/mfa/enroll": {
        status: 200,
        body: {
          secret: "JBSWY3DPEHPK3PXP",
          provisioning_url: "otpauth://totp/Qeet:ada?secret=JBSWY3DPEHPK3PXP",
        },
      },
    });
    render(<MfaEnrollment mfaToken="mfa-1" email="ada@example.com" onDone={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Set up an authenticator app" }));

    expect(await screen.findByText("Or enter this key")).toBeTruthy();
    expect(screen.getByText("JBSW Y3DP EHPK 3PXP")).toBeTruthy();
    expect(screen.getByRole("img", { name: /QR code/ })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Open authenticator app" }).getAttribute("href")).toBe(
      "otpauth://totp/Qeet:ada?secret=JBSWY3DPEHPK3PXP",
    );
  });

  it("shows the recovery codes once, and goes on only once they're saved", async () => {
    const calls = mockApi({
      "POST /v1/auth/mfa/enroll": {
        status: 200,
        body: { secret: "JBSWY3DPEHPK3PXP", provisioning_url: "otpauth://totp/x" },
      },
      "POST /v1/auth/session/mfa": {
        status: 200,
        body: { recovery_codes: ["aaaa-bbbb-cccc", "dddd-eeee-ffff"] },
      },
    });
    const onDone = vi.fn();
    render(<MfaEnrollment mfaToken="mfa-1" onDone={onDone} />);
    fireEvent.click(screen.getByRole("button", { name: "Set up an authenticator app" }));
    await screen.findByText("Or enter this key");

    const otp = screen.getAllByRole("textbox")[0] as HTMLInputElement;
    fireEvent.change(otp, { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm and continue" }));

    expect(await screen.findByText("aaaa-bbbb-cccc")).toBeTruthy();
    const next = screen.getByRole("button", { name: "Continue" });
    // Qeetrix keeps a disabled button focusable, so its reason can be read.
    expect(next.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(
      screen.getByRole("checkbox", { name: "I've saved these codes somewhere safe" }),
    );
    fireEvent.click(next);
    await waitFor(() => expect(onDone).toHaveBeenCalledOnce());
    expect(calls[1].body).toEqual({ mfa_token: "mfa-1", code: "123456" });
  });

  it("lets the person skip while the organisation's grace period lasts", async () => {
    const calls = mockApi({ "POST /v1/auth/session/mfa": { status: 200, body: {} } });
    const onDone = vi.fn();
    render(<MfaEnrollment mfaToken="mfa-1" dueAt="2026-12-01T00:00:00Z" onDone={onDone} />);

    fireEvent.click(screen.getByRole("button", { name: /Skip until/ }));

    await waitFor(() => expect(onDone).toHaveBeenCalledOnce());
    expect(calls[0].body).toEqual({ mfa_token: "mfa-1", skip: true });
  });
});
