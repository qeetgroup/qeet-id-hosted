// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@/i18n";

vi.mock("@/platform/navigation/go-to", () => ({ goTo: vi.fn() }));

import { goTo } from "@/platform/navigation/go-to";
import { AUTHORIZE, mockApi } from "@/testing/mock-api";
import { render } from "@/testing/render";
import { SignInForm, type SignInFormProps } from "../components/sign-in/sign-in-form";

function renderSignIn(overrides: Partial<SignInFormProps> = {}) {
  render(
    <SignInForm
      returnTo={AUTHORIZE}
      clientName="Acme"
      tenantId="tenant-1"
      providers={[]}
      selfRegistrationEnabled={false}
      rememberDeviceEnabled={false}
      passwordEnabled
      passkeyEnabled={false}
      magicLinkEnabled={false}
      errorCode=""
      {...overrides}
    />,
  );
}

// The email step, then the password step.
async function signIn(password = "correct horse") {
  fireEvent.change(screen.getByLabelText("Email address"), {
    target: { value: "ada@example.com" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  fireEvent.change(await screen.findByLabelText("Password"), { target: { value: password } });
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
}

const refuse = (status: number, code: string, message = "refused") => ({
  status,
  body: { error: { code, message } },
});

beforeEach(() => vi.mocked(goTo).mockReset());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});

describe("SignInForm", () => {
  it("asks for the email first, then the password, and returns to the application", async () => {
    const calls = mockApi({ "POST /v1/auth/session": { status: 200, body: { user_id: "u-1" } } });
    renderSignIn();
    expect(screen.getByRole("heading", { level: 1, name: "Sign in" })).toBeTruthy();
    expect(screen.getByText("Acme")).toBeTruthy();
    expect(screen.queryByLabelText("Password")).toBeNull();

    await signIn();

    expect(screen.getByRole("heading", { level: 1, name: "Enter your password" })).toBeTruthy();
    expect(screen.getByText("ada@example.com")).toBeTruthy();
    await waitFor(() => expect(goTo).toHaveBeenCalledWith(AUTHORIZE));
    expect(calls).toEqual([
      {
        method: "POST",
        path: "/v1/auth/session",
        body: { email: "ada@example.com", password: "correct horse", client_id: "app-1" },
      },
    ]);
  });

  it("goes back to the email step with Change, and to the passkeys page without an application", async () => {
    mockApi({ "POST /v1/auth/session": { status: 200, body: { user_id: "u-1" } } });
    renderSignIn({ returnTo: "", clientName: "" });

    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "ada@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(await screen.findByRole("button", { name: "Change" }));
    expect(screen.getByLabelText("Email address")).toBeTruthy();

    await signIn();
    await waitFor(() => expect(goTo).toHaveBeenCalledWith("/security"));
  });

  it("says a wrong password at the field, the same as an unknown address", async () => {
    mockApi({ "POST /v1/auth/session": refuse(401, "auth.invalid_credentials") });
    renderSignIn();

    await signIn();

    expect(
      await screen.findByText(
        "That email and password don't match. Try again, or reset your password.",
      ),
    ).toBeTruthy();
    expect(goTo).not.toHaveBeenCalled();
  });

  it("pauses sign-in after too many tries and offers the reset", async () => {
    mockApi({ "POST /v1/auth/session": refuse(429, "auth.account_locked") });
    renderSignIn();

    await signIn();

    expect(await screen.findByText("Sign-in is paused")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Reset password" }).getAttribute("href")).toBe(
      `/forgot-password?return_to=${encodeURIComponent(AUTHORIZE)}`,
    );
  });

  it("shows the server's reason for any other refusal, and a generic one when it can't be reached", async () => {
    mockApi({
      "POST /v1/auth/session": refuse(403, "auth.method_disabled", "Use another way to sign in."),
    });
    renderSignIn();
    await signIn();
    expect(await screen.findByText("Use another way to sign in.")).toBeTruthy();
    cleanup();

    mockApi({ "POST /v1/auth/session": new TypeError("Failed to fetch") });
    renderSignIn();
    await signIn();
    expect(await screen.findByText("Something went wrong")).toBeTruthy();
    expect(goTo).not.toHaveBeenCalled();
  });

  it("says a refused network the same way for a password and a social sign-in", async () => {
    mockApi({ "POST /v1/auth/session": refuse(403, "auth.address_not_allowed") });
    renderSignIn();
    await signIn();
    expect(await screen.findByText("You can't sign in from this network")).toBeTruthy();
    cleanup();

    // The social callback sends the browser back with ?error=address_not_allowed.
    renderSignIn({ errorCode: "address_not_allowed" });
    expect(screen.getByText("You can't sign in from this network")).toBeTruthy();
    expect(screen.queryByText("That sign-in didn't work")).toBeNull();
  });

  it("says why a social sign-in came back refused", () => {
    renderSignIn({ errorCode: "account_inactive" });
    expect(screen.getByText("This account is turned off")).toBeTruthy();
    cleanup();
    renderSignIn({ errorCode: "social" });
    expect(screen.getByText("That sign-in didn't work")).toBeTruthy();
  });

  it("asks for the second step instead of continuing, holding its token in memory", async () => {
    mockApi({
      "POST /v1/auth/session": {
        status: 200,
        body: { mfa_required: true, mfa_token: "mfa-1", factors: [{ type: "totp" }] },
      },
    });
    renderSignIn();

    await signIn();

    expect(await screen.findByRole("heading", { level: 1, name: "Verify it's you" })).toBeTruthy();
    expect(window.location.href).not.toContain("mfa-1");
    expect(goTo).not.toHaveBeenCalled();
  });

  it("takes a social sign-in's second step from the fragment, and clears it from the address", async () => {
    const calls = mockApi({
      "POST /v1/auth/session/mfa": { status: 200, body: { user_id: "u-1" } },
    });
    const factors = JSON.stringify([{ type: "totp" }, { type: "recovery_code" }]);
    window.history.replaceState(
      null,
      "",
      `/sign-in?return_to=${encodeURIComponent(AUTHORIZE)}#${new URLSearchParams({ mfa_token: "social-mfa", methods: "totp", factors })}`,
    );
    renderSignIn();

    expect(await screen.findByRole("heading", { level: 1, name: "Verify it's you" })).toBeTruthy();
    expect(window.location.hash).toBe("");
    expect(window.location.search).toContain("return_to=");
    fireEvent.click(screen.getByRole("button", { name: "Try another way" }));
    fireEvent.click(screen.getByRole("button", { name: /Use a recovery code/ }));
    fireEvent.change(screen.getByLabelText("Recovery code"), {
      target: { value: "aaaa-bbbb-cccc" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Verify" }));
    await waitFor(() => expect(goTo).toHaveBeenCalledWith(AUTHORIZE));
    expect(calls[0]).toMatchObject({
      path: "/v1/auth/session/mfa",
      body: { mfa_token: "social-mfa", code: "aaaa-bbbb-cccc" },
    });
  });

  it("comes back to approve the device after the second step", async () => {
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
    // A device journey has no application to name yet.
    renderSignIn({ returnTo: device, clientName: "" });
    expect(screen.getByText("Sign in to connect your device.")).toBeTruthy();

    await signIn();
    fireEvent.click(await screen.findByRole("button", { name: "Try another way" }));
    fireEvent.click(screen.getByRole("button", { name: /Use a recovery code/ }));
    fireEvent.change(screen.getByLabelText("Recovery code"), {
      target: { value: "aaaa-bbbb-cccc" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Verify" }));

    await waitFor(() => expect(goTo).toHaveBeenCalledWith(device));
    expect(calls.map((c) => c.path)).toEqual(["/v1/auth/session", "/v1/auth/session/mfa"]);
  });

  it("asks only for the proof when the application wants a fresh sign-in of a named account", () => {
    renderSignIn({ returnTo: `${AUTHORIZE}&prompt=login&login_hint=ada%40example.com` });

    expect(screen.getByRole("heading", { level: 1, name: "Confirm it's you" })).toBeTruthy();
    expect(screen.getByText("ada@example.com")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Change" })).toBeNull();
    expect(screen.getByLabelText("Password")).toBeTruthy();
  });

  it("emails a sign-in link when the organisation allows no password", async () => {
    const calls = mockApi({ "POST /v1/auth/magic-link/start": { status: 204 } });
    renderSignIn({ passwordEnabled: false, magicLinkEnabled: true });

    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "ada@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(await screen.findByRole("button", { name: "Email me the link" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Check your email" })).toBeTruthy();
    expect(calls[0]).toMatchObject({
      path: "/v1/auth/magic-link/start",
      body: {
        tenant_id: "tenant-1",
        email: "ada@example.com",
        app: "hosted_login",
        return_to: AUTHORIZE,
      },
    });
  });

  it("offers each social account the organisation turned on, named in full for screen readers", () => {
    renderSignIn({ providers: ["google", "github"] });
    expect(screen.getByRole("button", { name: "Sign in with Google" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Sign in with GitHub" })).toBeTruthy();
  });

  it("says so when the application has no way to sign in", () => {
    renderSignIn({ passwordEnabled: false, passkeyEnabled: false, magicLinkEnabled: false });
    expect(screen.getByText("There's no way to sign in here")).toBeTruthy();
    expect(screen.queryByLabelText("Email address")).toBeNull();
  });
});
