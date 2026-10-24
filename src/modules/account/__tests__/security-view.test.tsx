// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import "@/i18n";

import { mockApi } from "@/testing/mock-api";
import { SecurityView } from "../components/security-view";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const PASSKEY = {
  id: "p1",
  name: "Work laptop",
  created_at: "2026-10-01T09:00:00Z",
  last_used_at: null,
};

describe("SecurityView", () => {
  it("offers sign-in when the browser has no session", async () => {
    mockApi({
      "GET /v1/passkeys": { status: 401, body: { error: { code: "unauthorized", message: "" } } },
    });
    render(<SecurityView />);

    expect(await screen.findByText("Sign in to manage your passkeys")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Sign in" }).getAttribute("href")).toBe("/sign-in");
  });

  it("lists the user's passkeys and renames one", async () => {
    const calls = mockApi({
      "GET /v1/passkeys": { status: 200, body: { items: [PASSKEY], enrollment_allowed: true } },
      "PATCH /v1/passkeys/p1": { status: 200, body: { ...PASSKEY, name: "Home desktop" } },
    });
    render(<SecurityView />);

    expect(await screen.findByText("Work laptop")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Rename" }));
    fireEvent.change(screen.getByLabelText("Passkey name"), {
      target: { value: "  Home desktop " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(screen.getByText("Passkey renamed.")).toBeTruthy());
    expect(calls.find((c) => c.method === "PATCH")?.body).toEqual({ name: "Home desktop" });
  });
});
