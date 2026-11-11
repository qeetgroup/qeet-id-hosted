// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@/i18n";

vi.mock("@/platform/navigation/go-to", () => ({ goTo: vi.fn() }));

import { goTo } from "@/platform/navigation/go-to";
import { mockApi } from "@/testing/mock-api";
import { render } from "@/testing/render";
import { DeviceForm } from "../components/device-form";

beforeEach(() => vi.mocked(goTo).mockReset());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("DeviceForm", () => {
  it("sends a signed-out user to sign in, on the way back to this code", async () => {
    mockApi({
      "GET /v1/oauth/device": {
        status: 401,
        body: { error: { code: "unauthorized", message: "Sign in first." } },
      },
    });
    render(<DeviceForm userCode="ABCD-EFGH" />);

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() =>
      expect(goTo).toHaveBeenCalledWith(
        `/sign-in?return_to=${encodeURIComponent("/device?user_code=ABCD-EFGH")}`,
      ),
    );
  });

  it("signs out to change the account, then signs in again on the way back to the code", async () => {
    const calls = mockApi({
      "GET /v1/me": { status: 200, body: { email: "ada@example.com", display_name: "Ada" } },
      "DELETE /v1/auth/session": { status: 204 },
    });
    render(<DeviceForm userCode="ABCD-EFGH" />);

    fireEvent.click(await screen.findByRole("button", { name: "Change" }));

    await waitFor(() =>
      expect(goTo).toHaveBeenCalledWith(
        `/sign-in?return_to=${encodeURIComponent("/device?user_code=ABCD-EFGH")}`,
      ),
    );
    expect(calls.some((c) => c.method === "DELETE" && c.path === "/v1/auth/session")).toBe(true);
  });
});
