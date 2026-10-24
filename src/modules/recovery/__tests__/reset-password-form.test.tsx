// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import "@/i18n";

import { AUTHORIZE, mockApi } from "@/testing/mock-api";
import { render } from "@/testing/render";
import { ResetPasswordForm } from "../components/reset-password-form";

function choosePassword(confirm = "a new long password") {
  fireEvent.change(screen.getByLabelText("New password"), {
    target: { value: "a new long password" },
  });
  fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: confirm } });
  fireEvent.click(screen.getByRole("button", { name: "Reset password" }));
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("ResetPasswordForm", () => {
  it("resets the password and offers sign-in on the way back to the application", async () => {
    const calls = mockApi({ "POST /v1/auth/reset-password": { status: 204 } });
    render(<ResetPasswordForm token="reset-1" returnTo={AUTHORIZE} />);

    choosePassword();

    expect(await screen.findByText(/Your password has been reset/)).toBeTruthy();
    expect(calls).toEqual([
      {
        method: "POST",
        path: "/v1/auth/reset-password",
        body: { token: "reset-1", new_password: "a new long password" },
      },
    ]);
    expect(screen.getByRole("link", { name: "Go to sign in" }).getAttribute("href")).toBe(
      `/sign-in?return_to=${encodeURIComponent(AUTHORIZE)}`,
    );
  });

  it("drops a return_to that isn't the API's authorize URL", async () => {
    mockApi({ "POST /v1/auth/reset-password": { status: 204 } });
    render(<ResetPasswordForm token="reset-1" returnTo="https://evil.example/oauth/authorize" />);

    choosePassword();

    expect((await screen.findByRole("link", { name: "Go to sign in" })).getAttribute("href")).toBe(
      "/sign-in",
    );
  });

  it("stops passwords that don't match before sending anything", async () => {
    const calls = mockApi({});
    render(<ResetPasswordForm token="reset-1" returnTo="" />);

    choosePassword("not the same");

    expect(await screen.findByText("Those passwords don't match.")).toBeTruthy();
    expect(calls).toEqual([]);
  });

  it("says the link is broken when it carries no token", () => {
    mockApi({});
    render(<ResetPasswordForm token="" returnTo="" />);

    expect(screen.getByText(/This reset link is missing its token/)).toBeTruthy();
  });
});
