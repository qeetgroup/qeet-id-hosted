// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import "@/i18n";

import { mockApi } from "@/testing/mock-api";
import { MfaChallenge } from "../components/mfa/mfa-challenge";
import type { LoginFactor } from "../session";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const EMAIL: LoginFactor = { type: "email", id: "f1", destination: "a•••@example.com" };

function renderChallenge(factors: LoginFactor[], onVerified = vi.fn()) {
  render(
    <MfaChallenge
      mfaToken="mfa-1"
      factors={factors}
      rememberDeviceEnabled={false}
      onVerified={onVerified}
      onBack={vi.fn()}
    />,
  );
  return onVerified;
}

describe("MfaChallenge", () => {
  it("completes the challenge with a recovery code, holding the token in memory only", async () => {
    const calls = mockApi({ "POST /v1/auth/session/mfa": { status: 200, body: {} } });
    const onVerified = renderChallenge([{ type: "totp" }, { type: "recovery_code" }]);

    fireEvent.click(screen.getByRole("button", { name: "Use a recovery code" }));
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

  it("holds the send button while the server's wait runs, naming the wait", async () => {
    mockApi({
      "POST /v1/auth/mfa/send": {
        status: 429,
        body: {
          error: { code: "mfa.code_send_limited", message: "", metadata: { retry_after: 42 } },
        },
      },
    });
    renderChallenge([EMAIL]);

    fireEvent.click(screen.getByRole("button", { name: "Send a code to a•••@example.com" }));

    const held = await screen.findByRole("button", {
      name: /Send another code to a•••@example.com in/,
    });
    expect(held.hasAttribute("disabled")).toBe(true);
    expect(
      screen.getAllByText(
        "A code was sent to a•••@example.com recently. You can ask for another in 42 seconds.",
      ).length,
    ).toBeGreaterThan(0);
  });
});
