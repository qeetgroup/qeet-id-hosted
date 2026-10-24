// @vitest-environment jsdom
import { ThemeProvider } from "@qeetrix/ui/providers/theme-provider";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import "@/i18n";

import { ThemeToggle } from "../theme-toggle";

afterEach(() => {
  cleanup();
  localStorage.clear();
  document.documentElement.className = "";
});

describe("ThemeToggle", () => {
  it("switches to dark and remembers the choice", async () => {
    render(
      <ThemeProvider defaultTheme="light" storageKey="test-theme">
        <ThemeToggle />
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Theme" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: /Dark/ }));

    await waitFor(() => expect(document.documentElement.classList.contains("dark")).toBe(true));
    expect(localStorage.getItem("test-theme")).toBe("dark");
  });
});
