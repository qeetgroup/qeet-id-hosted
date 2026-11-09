// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import "@/i18n";

import type { LoginFactor } from "@/modules/authentication/session";
import { mockApi } from "@/testing/mock-api";
import { render } from "@/testing/render";
import { MfaChallenge } from "../components/mfa/mfa-challenge";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const EMAIL: LoginFactor = { type: "email", id: "f1", destination: "a•••@example.com" };

function renderChallenge(factors: LoginFactor[], onVerified = vi.fn(), remember = false) {
  render(
    <MfaChallenge
      mfaToken="mfa-1"
      factors={factors}
      email="ada@example.com"
      rememberDeviceEnabled={remember}
      onVerified={onVerified}
      onBack={vi.fn()}
    />,
  );
  return onVerified;
}

const refuse = (status: number, code: string, metadata?: Record<string, unknown>) => ({
  status,
  body: { error: { code, message: "refused", metadata } },
});

describe("MfaChallenge", () => {
  it("opens on the authenticator app, for the account the first step named", () => {
    renderChallenge([{ type: "totp" }, { type: "recovery_code" }]);
    expect(screen.getByRole("heading", { level: 1, name: "Verify it's you" })).toBeTruthy();
    expect(screen.getByText("Enter the 6-digit code from your authenticator app.")).toBeTruthy();
    expect(screen.getByText("ada@example.com")).toBeTruthy();
  });

  it("completes the challenge with a recovery code, holding the token in memory only", async () => {
    const calls = mockApi({ "POST /v1/auth/session/mfa": { status: 200, body: {} } });
    const onVerified = renderChallenge([{ type: "totp" }, { type: "recovery_code" }]);

    fireEvent.click(screen.getByRole("button", { name: "Try another way" }));
    fireEvent.click(screen.getByRole("button", { name: /Use a recovery code/ }));
    fireEvent.change(screen.getByLabelText("Recovery code"), {
      target: { value: "abcd-efgh-ijkl" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Verify" }));

    await waitFor(() => expect(onVerified).toHaveBeenCalledOnce());
    expect(calls[0]).toEqual({
      method: "POST",
      path: "/v1/auth/session/mfa",
      body: { mfa_token: "mfa-1", remember: false, code: "abcd-efgh-ijkl" },
    });
    expect(window.location.href).not.toContain("mfa-1");
  });

  it("says a wrong code at the field and keeps the page", async () => {
    mockApi({ "POST /v1/auth/session/mfa": refuse(401, "mfa.code_invalid") });
    const onVerified = renderChallenge([{ type: "recovery_code" }]);

    fireEvent.click(screen.getByRole("button", { name: /Use a recovery code/ }));
    fireEvent.change(screen.getByLabelText("Recovery code"), { target: { value: "nope" } });
    fireEvent.click(screen.getByRole("button", { name: "Verify" }));

    expect(await screen.findByText(/That code didn't work/)).toBeTruthy();
    expect(onVerified).not.toHaveBeenCalled();
  });

  it("emails a code, then holds Send another while the server's wait runs", async () => {
    mockApi({
      "POST /v1/auth/mfa/send": refuse(429, "mfa.code_send_limited", { retry_after: 42 }),
    });
    renderChallenge([EMAIL]);

    fireEvent.click(screen.getByRole("button", { name: /Email a code/ }));

    expect(
      await screen.findByText(
        "A code was sent to a•••@example.com recently. You can ask for another in 42 seconds.",
      ),
    ).toBeTruthy();
    const held = screen.getByRole("button", { name: /Send another code in/ });
    // Qeetrix keeps a disabled button focusable, so its reason can be read.
    expect(held.getAttribute("aria-disabled")).toBe("true");
  });

  it("shows the number to type on the phone, and moves on once the phone approves", async () => {
    let answers = 0;
    const calls = mockApi({
      "POST /v1/auth/mfa/push": {
        status: 200,
        body: { number: 47, expires_at: new Date(Date.now() + 120_000).toISOString() },
      },
    });
    // The first check finds the request unanswered; the second, approved.
    const fetch = vi.mocked(globalThis.fetch);
    const original = fetch.getMockImplementation();
    fetch.mockImplementation(async (input, init) => {
      if (String(input).endsWith("/v1/auth/session/mfa")) {
        answers++;
        return answers === 1
          ? new Response(JSON.stringify(refuse(409, "mfa.push_pending").body), { status: 409 })
          : new Response("{}", { status: 200 });
      }
      return (original as typeof globalThis.fetch)(input, init);
    });
    const onVerified = renderChallenge([{ type: "push" }]);

    expect(await screen.findByRole("img", { name: "Number to type: 47" })).toBeTruthy();
    await waitFor(() => expect(onVerified).toHaveBeenCalledOnce(), { timeout: 6000 });
    expect(screen.getByRole("heading", { level: 1, name: "Approved" })).toBeTruthy();
    expect(calls[0]).toMatchObject({ path: "/v1/auth/mfa/push", body: { mfa_token: "mfa-1" } });
  }, 10_000);

  it("says nobody signed in when the phone denies, and offers a new request", async () => {
    mockApi({
      "POST /v1/auth/mfa/push": { status: 200, body: { number: 12 } },
      "POST /v1/auth/session/mfa": refuse(401, "mfa.code_invalid"),
    });
    renderChallenge([{ type: "push" }, { type: "totp" }]);
    fireEvent.click(screen.getByRole("button", { name: "Try another way" }));
    fireEvent.click(screen.getByRole("button", { name: /Approve on your phone/ }));

    expect(
      await screen.findByRole(
        "heading",
        { level: 1, name: "You denied this sign-in" },
        { timeout: 5000 },
      ),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Send a new request" })).toBeTruthy();
  }, 10_000);
});
