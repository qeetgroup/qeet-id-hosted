// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
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
  capabilities: ["saml", "domain_verification", "scim"],
  expires_at: "2026-10-24T12:00:00Z",
  scim_base_url: "https://api.id.example/scim/v2",
};
const DRAFT = {
  id: "c1",
  name: "Acme Corp Okta",
  idp_entity_id: "",
  idp_sso_url: "",
  email_attribute: "",
  name_attribute: "",
  status: "draft",
  created_at: "2026-10-20T10:00:00Z",
  updated_at: "2026-10-20T10:00:00Z",
  last_login_at: null,
  acs_url: "https://api.id.example/saml/acs/c1",
  sp_entity_id: "https://api.id.example/saml/metadata/c1",
};
const CONNECTED = {
  ...DRAFT,
  idp_entity_id: "http://www.okta.com/exk1",
  idp_sso_url: "https://acme.okta.com/app/x/sso/saml",
};
const VERIFIED = {
  id: "d1",
  domain: "acme.example",
  dns_record_name: "_qeet-verification.acme.example",
  dns_record_type: "TXT",
  dns_record_value: "qeet-verify-1",
  status: "verified",
  sso_enabled: false,
};
const NOTHING = {
  "GET /v1/admin-portal/domains": { status: 200, body: { items: [] } },
  "GET /v1/admin-portal/saml": { status: 200, body: { items: [] } },
  "GET /v1/admin-portal/scim": { status: 200, body: { token_set: false, provisioned_count: 0 } },
};

async function open(routes: Parameters<typeof mockApi>[0], hash = "") {
  window.history.replaceState(null, "", `/enterprise-setup${hash}`);
  const calls = mockApi({
    "GET /v1/admin-portal/context": { status: 200, body: CONTEXT },
    ...routes,
  });
  render(<EnterpriseSetupPage />);
  await screen.findByRole("heading", { level: 1, name: "Set up single sign-on" });
  return calls;
}

describe("EnterpriseSetupPage", () => {
  it("exchanges the link's one-time token once, as a bearer credential, and clears it from the address", async () => {
    window.history.replaceState(null, "", "/enterprise-setup#token=one-time-abc");
    const calls = mockApi({
      "POST /v1/admin-portal/session": {
        status: 200,
        body: { context: CONTEXT, expires_at: CONTEXT.expires_at, redirect_url: "" },
      },
      ...NOTHING,
    });

    render(<EnterpriseSetupPage />);

    expect(
      await screen.findByRole("heading", { level: 1, name: "Set up single sign-on" }),
    ).toBeTruthy();
    expect(window.location.hash).toBe("");
    const exchanges = calls.filter((c) => c.path === "/v1/admin-portal/session");
    expect(exchanges).toHaveLength(1);
    expect(exchanges[0].authorization).toBe("Bearer one-time-abc");
    // Kept nowhere: not in storage, and not in any later request.
    expect(JSON.stringify({ ...localStorage, ...sessionStorage })).not.toContain("one-time-abc");
    expect(calls.filter((c) => c.authorization)).toHaveLength(1);
  });

  it("says the link doesn't work when the exchange is refused", async () => {
    window.history.replaceState(null, "", "/enterprise-setup#token=spent");
    mockApi({
      "POST /v1/admin-portal/session": {
        status: 401,
        body: { error: { code: "admin_portal.link_invalid", message: "spent" } },
      },
    });

    render(<EnterpriseSetupPage />);

    expect(
      await screen.findByRole("heading", { level: 1, name: "This link doesn't work" }),
    ).toBeTruthy();
  });

  it("starts on verifying the domain, with the rest still to come", async () => {
    await open(NOTHING);

    // The page's heading comes first; the steps once what the link may see has loaded.
    expect(
      await screen.findByRole("heading", { level: 2, name: "Verify your domain" }),
    ).toBeTruthy();
    expect(screen.getByText("Step 1 of 5")).toBeTruthy();
    expect(screen.getAllByText("After step 1").length).toBeGreaterThan(0);
    expect(screen.getByText(/Link works until/)).toBeTruthy();
  });

  it("saves the connection as a draft first, so the provider gets Qeet ID's values before its own", async () => {
    const calls = await open({
      ...NOTHING,
      "GET /v1/admin-portal/domains": { status: 200, body: { items: [VERIFIED] } },
      "POST /v1/admin-portal/saml": { status: 201, body: DRAFT },
    });

    expect(await screen.findByText("https://api.id.example/saml/acs/c1")).toBeTruthy();
    expect(screen.getByText("Single sign-on URL")).toBeTruthy();
    expect(screen.getByText("Audience URI (SP Entity ID)")).toBeTruthy();
    expect(
      calls.find((c) => c.method === "POST" && c.path === "/v1/admin-portal/saml")?.body,
    ).toEqual({
      name: "Acme Corp Okta",
    });
  });

  it("shows what the provider sent after a test sign-in, then turns single sign-on on for the domain", async () => {
    const calls = await open(
      {
        ...NOTHING,
        "GET /v1/admin-portal/domains": { status: 200, body: { items: [VERIFIED] } },
        "GET /v1/admin-portal/saml": { status: 200, body: { items: [CONNECTED] } },
        "POST /v1/admin-portal/saml/c1/test": { status: 200, body: { ok: true, checks: [] } },
        "GET /v1/admin-portal/saml/c1/test-sign-ins/t1": {
          status: 200,
          body: {
            id: "t1",
            connection_id: "c1",
            status: "succeeded",
            email: "it@acme.example",
            name: "Arjun Rao",
            name_id: "it@acme.example",
            email_domain_verified: true,
          },
        },
        "PATCH /v1/admin-portal/saml/c1": { status: 200, body: { ...CONNECTED, status: "active" } },
        "PATCH /v1/admin-portal/domains/d1": {
          status: 200,
          body: { ...VERIFIED, sso_enabled: true },
        },
      },
      "#saml_test=t1&saml_connection=c1",
    );

    expect(window.location.hash).toBe("");
    expect(await screen.findByText("Okta signed you in")).toBeTruthy();
    expect(screen.getByText("Domain verified")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Turn on single sign-on" }));

    expect(await screen.findByText("Single sign-on is on")).toBeTruthy();
    expect(
      calls.find((c) => c.method === "PATCH" && c.path === "/v1/admin-portal/saml/c1")?.body,
    ).toEqual({
      status: "active",
    });
    await waitFor(() =>
      expect(
        calls.find((c) => c.method === "PATCH" && c.path === "/v1/admin-portal/domains/d1")?.body,
      ).toEqual({ sso_enabled: true }),
    );
  });

  it("shows a new SCIM token once, and closes only once it's copied", async () => {
    await open({
      "GET /v1/admin-portal/domains": {
        status: 200,
        body: { items: [{ ...VERIFIED, sso_enabled: true }] },
      },
      "GET /v1/admin-portal/saml": {
        status: 200,
        body: { items: [{ ...CONNECTED, status: "active" }] },
      },
      "GET /v1/admin-portal/scim": {
        status: 200,
        body: { token_set: false, provisioned_count: 0 },
      },
      "POST /v1/admin-portal/scim/token": {
        status: 200,
        body: { token: "scim-secret", config: { token_set: true, provisioned_count: 0 } },
      },
    });

    fireEvent.click(await screen.findByRole("button", { name: "Turn on SCIM" }));

    expect(await screen.findByText("scim-secret")).toBeTruthy();
    // The endpoint goes with the first token, in the dialog (and on the finished page behind it).
    expect(screen.getAllByText("https://api.id.example/scim/v2").length).toBeGreaterThan(0);
    const done = screen.getByRole("button", { name: "Done" });
    expect(done.getAttribute("aria-disabled") ?? String(done.hasAttribute("disabled"))).toMatch(
      /true/,
    );
    fireEvent.click(screen.getByRole("checkbox", { name: "I've copied the token" }));
    fireEvent.click(done);
    await waitFor(() => expect(screen.queryByText("scim-secret")).toBeNull());
  });
});
