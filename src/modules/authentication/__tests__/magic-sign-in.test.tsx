// @vitest-environment jsdom
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import "@/i18n";

import { AUTHORIZE, mockApi } from "@/testing/mock-api";
import { render } from "@/testing/render";
import { MagicSignIn } from "../components/magic-link/magic-sign-in";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const NETWORK = "You can't sign in from this network";

describe("MagicSignIn", () => {
  it("says a refused network plainly, without offering a new link", async () => {
    mockApi({
      "POST /v1/auth/magic-link/session": {
        status: 403,
        body: { error: { code: "auth.address_not_allowed", message: "refused" } },
      },
    });
    render(<MagicSignIn token="tok-1" />);

    expect(await screen.findByText(NETWORK)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Send a new link" })).toBeNull();
    expect(screen.queryByText(/used already/)).toBeNull();
  });

  it("keeps the application's return address on Sign in another way", async () => {
    const returnTo = AUTHORIZE;
    mockApi({
      "POST /v1/auth/magic-link/session": {
        status: 410,
        body: { error: { code: "recovery.link_expired", message: "This link has expired." } },
      },
    });
    render(<MagicSignIn token="tok-1" returnTo={returnTo} />);
    const other = await screen.findByRole("link", { name: "Sign in another way" });
    expect(other.getAttribute("href")).toBe(
      `/sign-in?${new URLSearchParams({ return_to: returnTo })}`,
    );
  });

  it("drops a return address the sign-in page would refuse", async () => {
    mockApi({
      "POST /v1/auth/magic-link/session": {
        status: 410,
        body: { error: { code: "recovery.link_expired", message: "This link has expired." } },
      },
    });
    render(<MagicSignIn token="tok-1" returnTo="https://evil.example/phish" />);
    const other = await screen.findByRole("link", { name: "Sign in another way" });
    expect(other.getAttribute("href")).toBe("/sign-in");
  });

  it("still offers a new link for a link that has expired", async () => {
    mockApi({
      "POST /v1/auth/magic-link/session": {
        status: 410,
        body: { error: { code: "recovery.link_expired", message: "This link has expired." } },
      },
    });
    render(<MagicSignIn token="tok-2" />);

    expect(await screen.findByRole("button", { name: "Send a new link" })).toBeTruthy();
  });

  it("says to use the organisation's sign-in when the address must now use it, keeping the link", async () => {
    mockApi({
      "POST /v1/auth/magic-link/session": {
        status: 403,
        body: { error: { code: "auth.sso_required", message: "refused" } },
      },
    });
    render(<MagicSignIn token="tok-3" orgName="Brightleaf" />);

    expect(await screen.findByText("Use your organisation's sign-in")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Send a new link" })).toBeNull();
    expect(screen.queryByText(/used already/)).toBeNull();
  });

  it("says an incomplete link plainly, without asking the server", () => {
    const calls = mockApi({});
    render(<MagicSignIn token="" />);

    expect(screen.getByRole("heading", { level: 1, name: "This link is incomplete" })).toBeTruthy();
    expect(calls).toEqual([]);
  });
});
