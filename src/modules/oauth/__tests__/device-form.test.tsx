// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@/i18n";

vi.mock("@/platform/navigation/go-to", () => ({ goTo: vi.fn() }));

import { goTo } from "@/platform/navigation/go-to";
import { mockApi } from "@/testing/mock-api";
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
});
