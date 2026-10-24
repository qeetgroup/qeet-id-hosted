// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import "@/i18n";

import { ErrorPage } from "../error-page";

afterEach(cleanup);

describe("ErrorPage", () => {
  it("offers a retry and shows the reference, not the error itself", () => {
    const onRetry = vi.fn();
    render(<ErrorPage reference="3141592653" onRetry={onRetry} />);

    expect(screen.getByText("Something went wrong")).toBeTruthy();
    expect(screen.getByText("Reference: 3141592653")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("leaves the reference out when there is none", () => {
    render(<ErrorPage onRetry={() => {}} />);

    expect(screen.queryByText(/Reference:/)).toBeNull();
  });
});
