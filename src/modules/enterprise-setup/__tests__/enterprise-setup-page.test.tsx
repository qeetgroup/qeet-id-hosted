// @vitest-environment jsdom
import { cleanup, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import "@/i18n";

import { mockApi } from "@/testing/mock-api";
import { render } from "@/testing/render";
import { EnterpriseSetupPage } from "../components/enterprise-setup-page";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});

const CONTEXT = {
  tenant_name: "Acme Corp",
  capabilities: ["saml"],
  expires_at: "2026-10-24T12:00:00Z",
};
const SAML_LIST = { "GET /v1/admin-portal/saml": { status: 200, body: { items: [] } } };

describe("EnterpriseSetupPage", () => {
  it("exchanges the link's one-time token once, as a bearer credential, and clears it from the address", async () => {
    window.history.replaceState(null, "", "/enterprise-setup#token=one-time-abc");
    const calls = mockApi({
      "POST /v1/admin-portal/session": {
        status: 200,
        body: { context: CONTEXT, expires_at: CONTEXT.expires_at, redirect_url: "" },
      },
      ...SAML_LIST,
    });

    render(<EnterpriseSetupPage />);

    expect(await screen.findByText("Configure SSO for Acme Corp")).toBeTruthy();
    expect(window.location.hash).toBe("");
    const exchanges = calls.filter((c) => c.path === "/v1/admin-portal/session");
    expect(exchanges).toHaveLength(1);
    expect(exchanges[0].authorization).toBe("Bearer one-time-abc");
    // Kept nowhere: not in storage, and not in any later request.
    expect(JSON.stringify({ ...localStorage, ...sessionStorage })).not.toContain("one-time-abc");
    expect(calls.filter((c) => c.authorization)).toHaveLength(1);
  });

  it("without a token, reopens the portal session the browser already holds", async () => {
    window.history.replaceState(null, "", "/enterprise-setup");
    const calls = mockApi({
      "GET /v1/admin-portal/context": { status: 200, body: CONTEXT },
      ...SAML_LIST,
    });

    render(<EnterpriseSetupPage />);

    expect(await screen.findByText("Configure SSO for Acme Corp")).toBeTruthy();
    expect(calls.some((c) => c.path === "/v1/admin-portal/session")).toBe(false);
  });

  it("says the link isn't available when the exchange is refused", async () => {
    window.history.replaceState(null, "", "/enterprise-setup#token=spent");
    mockApi({
      "POST /v1/admin-portal/session": {
        status: 401,
        body: { error: { code: "adminportal.link_revoked", message: "revoked" } },
      },
    });

    render(<EnterpriseSetupPage />);

    expect(await screen.findByText("This link isn't available")).toBeTruthy();
    await waitFor(() => expect(window.location.hash).toBe(""));
  });
});
