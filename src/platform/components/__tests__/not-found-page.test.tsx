// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import "@/i18n";

import { NotFoundPage } from "../not-found-page";

afterEach(cleanup);

describe("NotFoundPage", () => {
  it("says the page doesn't exist and leads back to sign-in", () => {
    render(<NotFoundPage />);

    expect(screen.getByText("Page not found")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Go to sign in" }).getAttribute("href")).toBe(
      "/sign-in",
    );
  });
});
