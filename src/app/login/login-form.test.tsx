// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@/i18n";

vi.mock("@/lib/navigation", () => ({ goTo: vi.fn() }));

import { goTo } from "@/lib/navigation";
import { AUTHORIZE, mockApi } from "@/test-api";
import { LoginForm } from "./login-form";

function renderLogin(returnTo = AUTHORIZE, clientName = "Acme", errorCode = "") {
  render(
    <LoginForm
      returnTo={returnTo}
      clientName={clientName}
      tenantId="tenant-1"
      providers={[]}
      selfRegistrationEnabled={false}
      rememberDeviceEnabled={false}
      passwordEnabled
      passkeyEnabled={false}
      magicLinkEnabled={false}
      errorCode={errorCode}
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

  it("asks for the second factor a social sign-in came back with, and clears it from the address", async () => {
    const calls = mockApi({ "POST /v1/auth/session/mfa": { status: 200, body: { user_id: "u-1" } } });
    const factors = JSON.stringify([
      { type: "totp" },
      { type: "recovery_code" },
      { type: "email", id: "f-1", destination: "a***@example.com" },
    ]);
    window.history.replaceState(
      null,
      "",
      `/login?return_to=${encodeURIComponent(AUTHORIZE)}#${new URLSearchParams({ mfa_token: "social-mfa", methods: "totp,email", factors })}`,
    );
    renderLogin();

    expect(await screen.findByText("Two-step verification")).toBeTruthy();
    expect(window.location.hash).toBe("");
    expect(window.location.search).toContain("return_to=");
    fireEvent.click(screen.getByRole("button", { name: "Use a recovery code" }));
    fireEvent.change(screen.getByLabelText("Recovery code"), { target: { value: "aaaa-bbbb-cccc" } });
    fireEvent.click(screen.getByRole("button", { name: "Verify" }));
    await waitFor(() => expect(goTo).toHaveBeenCalledWith(AUTHORIZE));
    expect(calls[0]).toMatchObject({ method: "POST", path: "/v1/auth/session/mfa", body: { mfa_token: "social-mfa" } });
    window.history.replaceState(null, "", "/");
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

  it("comes back to approve the device after the second factor", async () => {
    const device = "/device?user_code=ABCD-EFGH";
    const calls = mockApi({
      "POST /v1/auth/session": {
        status: 200,
        body: {
          mfa_required: true,
          mfa_token: "mfa-1",
          factors: [{ type: "totp" }, { type: "recovery_code" }],
        },
      },
      "POST /v1/auth/session/mfa": { status: 200, body: { user_id: "u-1" } },
    });
    // A device journey has no client to name.
    renderLogin(device, "");
    expect(screen.getByRole("heading", { name: "Sign in to approve a device" })).toBeTruthy();

    signIn();
    fireEvent.click(await screen.findByRole("button", { name: "Use a recovery code" }));
    fireEvent.change(screen.getByLabelText("Recovery code"), { target: { value: "aaaa-bbbb-cccc" } });
    fireEvent.click(screen.getByRole("button", { name: "Verify" }));

    await waitFor(() => expect(goTo).toHaveBeenCalledWith(device));
    expect(calls.map((c) => c.path)).toEqual(["/v1/auth/session", "/v1/auth/session/mfa"]);
  });

  it("says a refused network the same way for a password and a social sign-in", async () => {
    const network = "Your organisation doesn't allow sign-in from this network. Contact your administrator.";
    mockApi({
      "POST /v1/auth/session": {
        status: 403,
        body: { error: { code: "auth.address_not_allowed", message: "refused" } },
      },
    });
    renderLogin();
    signIn();
    expect(await screen.findByText(network)).toBeTruthy();
    expect(goTo).not.toHaveBeenCalled();
    cleanup();

    // The social callback sends the browser back with ?error=address_not_allowed.
    renderLogin(AUTHORIZE, "Acme", "address_not_allowed");
    expect(screen.getByText(network)).toBeTruthy();
    expect(screen.queryByText(/couldn't sign you in with that provider/)).toBeNull();
  });
});
