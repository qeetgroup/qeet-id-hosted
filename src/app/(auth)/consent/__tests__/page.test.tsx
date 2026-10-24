// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@/i18n";

vi.mock("@/platform/navigation/go-to", () => ({ goTo: vi.fn() }));

import { goTo } from "@/platform/navigation/go-to";
import { mockApi } from "@/testing/mock-api";
import ConsentRoute from "../page";

beforeEach(() => vi.mocked(goTo).mockReset());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

// The request the API recorded for id req-1: app-1 asking for openid + email.
const recorded = {
  "GET /v1/oauth/authorize/request": {
    status: 200,
    body: { request_id: "req-1", client_id: "app-1", scope: "openid email" },
  },
  "GET /v1/oauth/login-context": { status: 200, body: { client_name: "Acme Notes" } },
};

// Renders the page the way the API sends the browser to it, with whatever else
// a crafted link might add to the address.
async function openConsent(params: Record<string, string>) {
  render(await ConsentRoute({ searchParams: Promise.resolve(params) }));
  return screen.findByRole("button", { name: "Allow" });
}

describe("Consent", () => {
  it("decides on the recorded request by its id alone, and follows the API's redirect", async () => {
    const calls = mockApi({
      ...recorded,
      "POST /v1/oauth/authorize/decision": {
        status: 200,
        body: { redirect: "https://app.example/cb?code=c1&state=s1" },
      },
    });
    fireEvent.click(await openConsent({ request_id: "req-1" }));

    await waitFor(() =>
      expect(goTo).toHaveBeenCalledWith("https://app.example/cb?code=c1&state=s1"),
    );
    const decision = calls.find((c) => c.path === "/v1/oauth/authorize/decision");
    expect(decision?.body).toEqual({ request_id: "req-1", approve: true });
  });

  it("shows the recorded application and scopes, never values added to the address", async () => {
    const calls = mockApi(recorded);
    await openConsent({
      request_id: "req-1",
      client_id: "evil-app",
      scope: "openid admin:super",
      redirect_uri: "https://evil.example/cb",
    });

    expect(screen.getByText("Acme Notes")).toBeTruthy();
    expect(screen.queryByText(/admin:super/)).toBeNull();
    const looked = calls.map((c) => c.path);
    expect(looked).toContain("/v1/oauth/authorize/request");
    // Branding and name are looked up for the recorded client, app-1.
    const context = vi
      .mocked(fetch)
      .mock.calls.map(([u]) => String(u))
      .find((u) => u.includes("login-context"));
    expect(context).toContain("client_id=app-1");
  });

  it("keeps the outcome on the page when the API won't send the browser back", async () => {
    mockApi({
      ...recorded,
      "POST /v1/oauth/authorize/decision": {
        status: 400,
        body: { error: { code: "oidc.redirect_uri_not_registered", message: "not registered" } },
      },
    });
    await openConsent({ request_id: "req-1" });
    fireEvent.click(screen.getByRole("button", { name: "Deny" }));

    expect(await screen.findByText(/return address is no longer registered/)).toBeTruthy();
    expect(goTo).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Allow" })).toBeNull();
  });

  it("refuses a request the API doesn't hold, showing none of it", async () => {
    mockApi({
      "GET /v1/oauth/authorize/request": {
        status: 400,
        body: { error: { code: "oidc.consent_request_invalid", message: "invalid" } },
      },
    });
    render(
      await ConsentRoute({
        searchParams: Promise.resolve({ request_id: "gone", client_id: "app-1" }),
      }),
    );

    expect(await screen.findByText(/expired or was already answered/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Allow" })).toBeNull();
  });

  it("refuses a link with no request id without asking the API", async () => {
    const calls = mockApi({});
    render(
      await ConsentRoute({
        searchParams: Promise.resolve({ client_id: "app-1", scope: "openid" }),
      }),
    );

    expect(await screen.findByText(/expired or was already answered/)).toBeTruthy();
    expect(calls).toHaveLength(0);
  });

  it("says a refused network on the page, and offers no retry", async () => {
    mockApi({
      ...recorded,
      "POST /v1/oauth/authorize/decision": {
        status: 403,
        body: { error: { code: "auth.address_not_allowed", message: "refused" } },
      },
    });
    fireEvent.click(await openConsent({ request_id: "req-1" }));

    expect(await screen.findByText(/doesn't allow sign-in from this network/)).toBeTruthy();
    expect(goTo).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Allow" })).toBeNull();
  });
});
