// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import "@/i18n";

import { mockApi } from "@/testing/mock-api";
import { render } from "@/testing/render";
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

    expect(await screen.findByText("Sign in to see your passkeys")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Sign in" }).getAttribute("href")).toBe("/sign-in");
  });

  it("lists the user's passkeys and renames one", async () => {
    const calls = mockApi({
      "GET /v1/passkeys": { status: 200, body: { items: [PASSKEY], enrollment_allowed: true } },
      "PATCH /v1/passkeys/p1": { status: 200, body: { ...PASSKEY, name: "Home desktop" } },
    });
    render(<SecurityView />);

    expect(await screen.findByText("Work laptop")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Rename Work laptop" }));
    fireEvent.change(screen.getByLabelText("Passkey name"), {
      target: { value: "  Home desktop " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(screen.getByText("Passkey renamed.")).toBeTruthy());
    expect(calls.find((c) => c.method === "PATCH")?.body).toEqual({ name: "Home desktop" });
  });

  it("removes a passkey once confirmed, and says so", async () => {
    const calls = mockApi({
      "GET /v1/passkeys": { status: 200, body: { items: [PASSKEY], enrollment_allowed: true } },
      "GET /v1/me": { status: 200, body: { email: "ada@example.com" } },
      "DELETE /v1/passkeys/p1": { status: 204 },
    });
    render(<SecurityView />);

    fireEvent.click(await screen.findByRole("button", { name: "Remove Work laptop" }));
    expect(await screen.findByText("Remove “Work laptop”?")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Remove passkey" }));

    expect(await screen.findByText("Passkey removed.")).toBeTruthy();
    expect(screen.queryByText("Work laptop")).toBeNull();
    expect(calls.some((c) => c.method === "DELETE" && c.path === "/v1/passkeys/p1")).toBe(true);
  });

  it("asks for a fresh sign-in when the server wants a recent one to remove a passkey", async () => {
    mockApi({
      "GET /v1/passkeys": { status: 200, body: { items: [PASSKEY], enrollment_allowed: true } },
      "GET /v1/me": { status: 200, body: { email: "ada@example.com" } },
      "DELETE /v1/passkeys/p1": {
        status: 403,
        body: { error: { code: "step_up_required", message: "" } },
      },
    });
    render(<SecurityView />);

    fireEvent.click(await screen.findByRole("button", { name: "Remove Work laptop" }));
    fireEvent.click(await screen.findByRole("button", { name: "Remove passkey" }));

    expect(await screen.findByText("Sign in again to remove a passkey")).toBeTruthy();
    expect(screen.getByText("Work laptop")).toBeTruthy();
  });
});
