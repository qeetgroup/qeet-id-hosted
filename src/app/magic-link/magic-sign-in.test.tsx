// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import "@/i18n";

import { mockApi } from "@/test-api";
import { MagicSignIn } from "./magic-sign-in";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const NETWORK =
  "Your organisation doesn't allow sign-in from this network. Contact your administrator.";

describe("MagicSignIn", () => {
  it("says a refused network plainly, without offering a new link or another way in", async () => {
    mockApi({
      "POST /v1/auth/magic-link/session": {
        status: 403,
        body: { error: { code: "auth.address_not_allowed", message: "refused" } },
      },
    });
    render(<MagicSignIn token="tok-1" />);

    expect(await screen.findByText(NETWORK)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Send a new link" })).toBeNull();
    expect(screen.queryByText("Sign in another way")).toBeNull();
    expect(screen.queryByText(/used already or expired/)).toBeNull();
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
});
