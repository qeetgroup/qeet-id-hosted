// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@/i18n";

vi.mock("@/lib/navigation", () => ({ goTo: vi.fn() }));

import { goTo } from "@/lib/navigation";
import { mockApi, TEST_API } from "@/test-api";
import { SignOutConfirm } from "./sign-out-confirm";

beforeEach(() => vi.mocked(goTo).mockReset());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Sign-out confirmation", () => {
  it("signs out only when the person confirms, carrying the API's ticket back", async () => {
    mockApi({
      "GET /v1/oauth/login-context": { status: 200, body: { client_name: "Acme Notes" } },
    });
    render(
      <SignOutConfirm
        ticket="tkt"
        clientId="app-1"
        postLogoutRedirect="https://app.example/bye"
        state="s1"
      />,
    );

    expect(await screen.findByText("Acme Notes asked to sign you out of Qeet ID.")).toBeTruthy();
    expect(goTo).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    const url = new URL(vi.mocked(goTo).mock.calls[0][0]);
    expect(url.origin + url.pathname).toBe(`${TEST_API}/v1/oauth/logout`);
    expect(url.searchParams.get("logout_confirmation")).toBe("tkt");
    expect(url.searchParams.get("post_logout_redirect_uri")).toBe("https://app.example/bye");
    expect(url.searchParams.get("state")).toBe("s1");
  });

  it("leaves the person signed in when they decline", async () => {
    mockApi({});
    render(<SignOutConfirm ticket="tkt" clientId="" postLogoutRedirect="" state="" />);
    fireEvent.click(screen.getByRole("button", { name: "Stay signed in" }));
    expect(await screen.findByText("You're still signed in")).toBeTruthy();
    expect(goTo).not.toHaveBeenCalled();
  });

  it("offers nothing without a ticket", () => {
    mockApi({});
    render(<SignOutConfirm ticket="" clientId="" postLogoutRedirect="" state="" />);
    expect(screen.getByText("This sign-out link isn't valid")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Sign out" })).toBeNull();
  });
});
