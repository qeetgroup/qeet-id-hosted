// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@/i18n";

vi.mock("@/lib/navigation", () => ({ goTo: vi.fn() }));

import { goTo } from "@/lib/navigation";
import { AUTHORIZE, mockApi } from "@/test-api";
import { SignupForm } from "./signup-form";

function renderSignup(selfRegistrationEnabled = true) {
  render(
    <SignupForm
      returnTo={AUTHORIZE}
      clientName="Acme"
      tenantId="tenant-1"
      selfRegistrationEnabled={selfRegistrationEnabled}
    />,
  );
}

function fillPasswordForm(confirm = "correct horse battery") {
  fireEvent.click(screen.getByRole("button", { name: "Use a password instead" }));
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Ada" } });
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ada@example.com" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "correct horse battery" } });
  fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: confirm } });
  fireEvent.click(screen.getByRole("button", { name: "Create account" }));
}

beforeEach(() => vi.mocked(goTo).mockReset());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("SignupForm", () => {
  it("creates the account in the application's tenant and returns to it", async () => {
    const calls = mockApi({ "POST /v1/auth/register": { status: 201, body: {} } });
    renderSignup();

    fillPasswordForm();

    await waitFor(() => expect(goTo).toHaveBeenCalledWith(AUTHORIZE));
    expect(calls).toEqual([
      {
        method: "POST",
        path: "/v1/auth/register",
        body: {
          tenant_id: "tenant-1",
          email: "ada@example.com",
          password: "correct horse battery",
          display_name: "Ada",
        },
      },
    ]);
  });

  it("stops passwords that don't match before sending anything", async () => {
    const calls = mockApi({});
    renderSignup();

    fillPasswordForm("something else");

    expect(await screen.findByText("Those passwords don't match.")).toBeTruthy();
    expect(calls).toEqual([]);
  });

  it("says sign-ups are closed when the application doesn't allow them", () => {
    mockApi({});
    renderSignup(false);

    expect(screen.getByText(/Sign-ups aren't open for this application/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Create account" })).toBeNull();
  });
});
