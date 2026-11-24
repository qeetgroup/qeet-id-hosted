// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@/i18n";

vi.mock("@/platform/navigation/go-to", () => ({ goTo: vi.fn() }));

import { goTo } from "@/platform/navigation/go-to";
import { AUTHORIZE, mockApi } from "@/testing/mock-api";
import { render } from "@/testing/render";
import { SignUpForm } from "../components/sign-up/sign-up-form";

function renderSignUp(selfRegistrationEnabled = true) {
  render(
    <SignUpForm
      returnTo={AUTHORIZE}
      clientName="Acme"
      organizationId="org-1"
      selfRegistrationEnabled={selfRegistrationEnabled}
    />,
  );
}

function fillPasswordForm(confirm = "correct horse battery") {
  fireEvent.click(screen.getByRole("button", { name: "Use a password instead" }));
  fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Ada" } });
  fireEvent.change(screen.getByLabelText("Work email"), {
    target: { value: "ada@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "correct horse battery" },
  });
  fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: confirm } });
  fireEvent.click(screen.getByRole("button", { name: "Create account" }));
}

beforeEach(() => vi.mocked(goTo).mockReset());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("SignUpForm", () => {
  it("creates the account in the application's organisation and returns to it", async () => {
    const calls = mockApi({ "POST /v1/auth/register": { status: 201, body: {} } });
    renderSignUp();

    fillPasswordForm();

    await waitFor(() => expect(goTo).toHaveBeenCalledWith(AUTHORIZE));
    expect(calls).toEqual([
      {
        method: "POST",
        path: "/v1/auth/register",
        body: {
          organization_id: "org-1",
          email: "ada@example.com",
          password: "correct horse battery",
          display_name: "Ada",
        },
      },
    ]);
  });

  it("stops passwords that don't match before sending anything", async () => {
    const calls = mockApi({});
    renderSignUp();

    fillPasswordForm("something else");

    expect(
      await screen.findByText("The two passwords don't match. Type the same password in both."),
    ).toBeTruthy();
    expect(calls).toEqual([]);
  });

  it("says sign-ups are closed when the application doesn't allow them", () => {
    mockApi({});
    renderSignUp(false);

    expect(screen.getByText("Sign-up is by invitation")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Sign in" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Create account" })).toBeNull();
  });

  it("says a rule the password doesn't meet at the field, in the server's words", async () => {
    mockApi({
      "POST /v1/auth/register": {
        status: 422,
        body: {
          error: {
            code: "authpolicy.password_no_number",
            message: "Your password must contain a number.",
          },
        },
      },
    });
    renderSignUp();

    fillPasswordForm();

    expect(await screen.findByText("Your password must contain a number.")).toBeTruthy();
    expect(goTo).not.toHaveBeenCalled();
  });

  it("makes a passkey-first account in the application's organisation", async () => {
    vi.stubGlobal("PublicKeyCredential", { parseCreationOptionsFromJSON: (o: unknown) => o });
    Object.defineProperty(navigator, "credentials", {
      configurable: true,
      value: { create: async () => ({ toJSON: () => ({ id: "cred-1", type: "public-key" }) }) },
    });
    const calls = mockApi({
      "POST /v1/register/passkey/begin": {
        status: 200,
        body: { session_id: "su-1", publicKey: { challenge: "c" } },
      },
      "POST /v1/register/passkey/finish": { status: 201, body: { user_id: "u-1" } },
    });
    try {
      renderSignUp();
      fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Ada" } });
      fireEvent.change(screen.getByLabelText("Work email"), {
        target: { value: "ada@example.com" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Create account with a passkey" }));

      await waitFor(() => expect(goTo).toHaveBeenCalledWith(AUTHORIZE));
      expect(calls[0]).toMatchObject({
        path: "/v1/register/passkey/begin",
        body: { organization_id: "org-1", email: "ada@example.com", display_name: "Ada" },
      });
      expect(calls[1]).toMatchObject({
        path: "/v1/register/passkey/finish",
        body: { session_id: "su-1", credential: { id: "cred-1", type: "public-key" } },
      });
    } finally {
      Reflect.deleteProperty(navigator, "credentials");
    }
  });

  it("says to use the organisation's sign-in for an address it signs in itself", async () => {
    mockApi({
      "POST /v1/auth/register": {
        status: 403,
        body: { error: { code: "auth.sso_required", message: "refused" } },
      },
    });
    renderSignUp();
    fillPasswordForm();

    expect(await screen.findByText("Use your organisation's sign-in")).toBeTruthy();
    expect(goTo).not.toHaveBeenCalled();
  });

  it("offers a passkey first, with no password field", () => {
    mockApi({});
    renderSignUp();

    expect(screen.getByRole("button", { name: "Create account with a passkey" })).toBeTruthy();
    expect(screen.queryByLabelText("Password")).toBeNull();
  });
});
