// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { render } from "@/testing/render";
import { ClientIdentity } from "../components/sign-in/client-identity";

afterEach(cleanup);

describe("ClientIdentity", () => {
  it("shows the application's logo, name and home page host", () => {
    const { container } = render(
      <ClientIdentity
        name="Acme Notes"
        logoUri="https://cdn.acme.com/logo.png"
        uri="https://www.acme.com/notes"
      />,
    );
    expect(container.querySelector("img")?.getAttribute("src")).toBe(
      "https://cdn.acme.com/logo.png",
    );
    expect(screen.getByText("Acme Notes")).toBeTruthy();
    expect(screen.getByText("· acme.com")).toBeTruthy();
  });

  it("renders only https addresses, and the monogram in place of a missing logo", () => {
    const { container } = render(
      <ClientIdentity name="acme" logoUri="http://acme.com/logo.png" uri="javascript:alert(1)" />,
    );
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("A")).toBeTruthy();
    expect(screen.queryByText(/·/)).toBeNull();
  });

  it("falls back to the monogram when the logo fails to load", () => {
    const { container } = render(
      <ClientIdentity name="Acme" logoUri="https://cdn.acme.com/missing.png" />,
    );
    fireEvent.error(container.querySelector("img") as HTMLImageElement);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("A")).toBeTruthy();
  });
});
