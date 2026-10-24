// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import "@/i18n";

import { mockApi } from "@/testing/mock-api";
import { render } from "@/testing/render";
import { ScimPanel } from "../components/scim-panel";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("ScimPanel", () => {
  it("shows a new bearer token once, until the admin says it's saved", async () => {
    mockApi({
      "GET /v1/admin-portal/scim": {
        status: 200,
        body: { token_set: false, provisioned_count: 1 },
      },
      "POST /v1/admin-portal/scim/token": {
        status: 200,
        body: {
          token: "scim-secret",
          config: { token_set: true, token_prefix: "qs_ab", provisioned_count: 1 },
        },
      },
    });
    render(<ScimPanel />);

    expect(await screen.findByText("1 user provisioned via SCIM.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Enable SCIM" }));

    expect(await screen.findByDisplayValue("scim-secret")).toBeTruthy();
    expect(screen.getByText("Your new SCIM bearer token")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "I've saved it" }));
    expect(screen.queryByDisplayValue("scim-secret")).toBeNull();
    expect(screen.getByRole("button", { name: "Roll token" })).toBeTruthy();
  });

  it("disables provisioning only after the admin confirms", async () => {
    const calls = mockApi({
      "GET /v1/admin-portal/scim": {
        status: 200,
        body: { token_set: true, token_prefix: "qs_ab", provisioned_count: 3 },
      },
      "DELETE /v1/admin-portal/scim/token": { status: 204 },
    });
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false);
    render(<ScimPanel />);

    expect(await screen.findByText("3 users provisioned via SCIM.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Disable" }));
    expect(confirm).toHaveBeenCalledWith("Disable SCIM provisioning? Your IdP will stop syncing.");
    expect(calls.some((c) => c.method === "DELETE")).toBe(false);
    confirm.mockRestore();
  });
});
