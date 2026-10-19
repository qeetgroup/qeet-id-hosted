// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@/i18n";

vi.mock("@/lib/navigation", () => ({ goTo: vi.fn() }));

import { goTo } from "@/lib/navigation";
import { AUTHORIZE, mockApi } from "@/test-api";
import { LoginForm } from "./login-form";

function renderLogin(returnTo = AUTHORIZE) {
  render(
    <LoginForm
      returnTo={returnTo}
      clientName="Acme"
      tenantId="tenant-1"
      providers={[]}
      selfRegistrationEnabled={false}
      rememberDeviceEnabled={false}
      passwordEnabled
      passkeyEnabled={false}
      magicLinkEnabled={false}
      errorCode=""
    />,
  );
}

function signIn() {
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ada@example.com" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "correct horse" } });
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
}

beforeEach(() => vi.mocked(goTo).mockReset());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("LoginForm", () => {
  it("signs in for the application and returns to it", async () => {
    const calls = mockApi({ "POST /v1/auth/session": { status: 200, body: { user_id: "u-1" } } });
    renderLogin();

    signIn();

    await waitFor(() => expect(goTo).toHaveBeenCalledWith(AUTHORIZE));
    expect(calls).toEqual([
      {
        method: "POST",
        path: "/v1/auth/session",
        body: { email: "ada@example.com", password: "correct horse", client_id: "app-1" },
      },
    ]);
  });

  it("goes to the security page when there is no application to return to", async () => {
    mockApi({ "POST /v1/auth/session": { status: 200, body: { user_id: "u-1" } } });
    renderLogin("");

    signIn();

    await waitFor(() => expect(goTo).toHaveBeenCalledWith("/security"));
  });

  it("asks for the second factor instead of continuing when MFA is required", async () => {
    mockApi({
      "POST /v1/auth/session": {
        status: 200,
        body: { mfa_required: true, mfa_token: "mfa-1", factors: [{ type: "totp" }] },
      },
    });
    renderLogin();

    signIn();

    expect(await screen.findByText("Two-step verification")).toBeTruthy();
    expect(goTo).not.toHaveBeenCalled();
  });

  it("shows the server's reason when sign-in is refused", async () => {
    mockApi({
      "POST /v1/auth/session": {
        status: 401,
        body: { error: { code: "invalid_credentials", message: "Email or password is incorrect." } },
      },
    });
    renderLogin();

    signIn();

    expect(await screen.findByText("Email or password is incorrect.")).toBeTruthy();
    expect(goTo).not.toHaveBeenCalled();
  });

  it("shows a generic message when the API can't be reached", async () => {
    mockApi({ "POST /v1/auth/session": new TypeError("Failed to fetch") });
    renderLogin();

    signIn();

    expect(await screen.findByText("Something went wrong. Please try again.")).toBeTruthy();
    expect(goTo).not.toHaveBeenCalled();
  });
});
