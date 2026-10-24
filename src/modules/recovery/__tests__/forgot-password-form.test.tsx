// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import "@/i18n";

import { AUTHORIZE, mockApi } from "@/testing/mock-api";
import { ForgotPasswordForm } from "../components/forgot-password-form";

function requestLink() {
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ada@example.com" } });
  fireEvent.click(screen.getByRole("button", { name: "Send reset link" }));
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("ForgotPasswordForm", () => {
  it("asks for a hosted-login reset link that keeps the way back to the application", async () => {
    const calls = mockApi({ "POST /v1/auth/forgot-password": { status: 202, body: {} } });
    render(<ForgotPasswordForm returnTo={AUTHORIZE} />);

    requestLink();

    expect(await screen.findByText(/we've sent a password reset link/)).toBeTruthy();
    expect(calls).toEqual([
      {
        method: "POST",
        path: "/v1/auth/forgot-password",
        body: { email: "ada@example.com", app: "hosted_login", return_to: AUTHORIZE },
      },
    ]);
  });

  it("shows the server's reason when the request is refused", async () => {
    mockApi({
      "POST /v1/auth/forgot-password": {
        status: 429,
        body: { error: { code: "rate_limited", message: "Too many requests. Try again later." } },
      },
    });
    render(<ForgotPasswordForm returnTo="" />);

    requestLink();

    expect(await screen.findByText("Too many requests. Try again later.")).toBeTruthy();
  });
});
