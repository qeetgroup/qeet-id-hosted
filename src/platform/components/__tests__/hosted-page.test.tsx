// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import "@/i18n";

import { render } from "@/testing/render";
import { HostedPage } from "../hosted-page";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("HostedPage", () => {
  it("names the page in its one top-level heading, under Qeet ID's logo", () => {
    render(<HostedPage title="Sign in" description="To continue." />);

    expect(screen.getByRole("heading", { level: 1, name: "Sign in" })).toBeTruthy();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByText("Qeet ID")).toBeTruthy();
    expect(screen.getByRole("main")).toBeTruthy();
  });

  it("links the website's legal pages in a new tab, and says so", () => {
    render(<HostedPage title="Sign in" />);

    const legal = screen.getByRole("navigation", { name: "Legal" });
    const terms = legal.querySelector("a[href='https://id.qeet.in/legal/terms']");
    expect(terms?.getAttribute("target")).toBe("_blank");
    expect(terms?.textContent).toContain("(opens in a new tab)");
  });

  it("puts an organisation's colour on the page, and its logo in place of Qeet ID's", () => {
    const { container } = render(
      <HostedPage
        title="Sign in"
        branding={{ logoUrl: "https://cdn.example.test/logo.svg", primaryColor: "#2e7d4f" }}
      />,
    );

    const root = container.firstElementChild as HTMLElement;
    expect(root.classList.contains("hosted-branded")).toBe(true);
    expect(root.style.getPropertyValue("--brand")).toBe("#2e7d4f");
    expect(container.querySelector("img")?.getAttribute("src")).toBe(
      "https://cdn.example.test/logo.svg",
    );
    // The footer says who runs the sign-in.
    expect(screen.getByText("Sign-in by")).toBeTruthy();
  });

  it("offers the language and the theme in the footer", async () => {
    render(<HostedPage title="Sign in" />);

    expect(screen.getByRole("button", { name: /Language: English/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Theme" }));
    fireEvent.click(await screen.findByRole("menuitemradio", { name: /Dark/ }));
    expect(document.documentElement.getAttribute("data-qx-color-scheme")).toBe("dark");
    expect(localStorage.getItem("qeetid-login-theme")).toBe("dark");
  });
});
