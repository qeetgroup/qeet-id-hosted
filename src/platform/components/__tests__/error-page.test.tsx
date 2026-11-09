// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import "@/i18n";

import { render } from "@/testing/render";
import { ErrorPage } from "../error-page";

afterEach(cleanup);

describe("ErrorPage", () => {
  it("offers a retry and the reference to copy, not the error itself", () => {
    const onRetry = vi.fn();
    render(<ErrorPage reference="3141592653" onRetry={onRetry} />);

    expect(screen.getByRole("heading", { level: 1, name: "Something went wrong" })).toBeTruthy();
    expect(screen.getByText("3141592653")).toBeTruthy();
    expect(
      screen.getByText("If it keeps happening, send this to your administrator."),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("leaves the reference out when there is none", () => {
    render(<ErrorPage onRetry={() => {}} />);

    expect(screen.queryByText("Reference")).toBeNull();
  });
});
