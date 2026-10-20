// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@/i18n";

vi.mock("@/lib/navigation", () => ({ goTo: vi.fn() }));

import { goTo } from "@/lib/navigation";
import { TEST_API } from "@/test-api";
import { FRONTCHANNEL_TIMEOUT_MS, LoggedOutContent } from "./logged-out-content";

beforeEach(() => {
  vi.mocked(goTo).mockReset();
  window.__QEET_PUBLIC_CONFIG__ = { apiUrl: TEST_API };
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const pages = ["https://a.example/fc?iss=qeet&sid=s1", "https://b.example/fc?iss=qeet&sid=s1"];

describe("Signed-out page", () => {
  it("loads every application's sign-out page before saying the person is signed out", () => {
    const { container } = render(<LoggedOutContent frontchannel={pages} />);
    const frames = container.querySelectorAll("iframe");
    expect([...frames].map((f) => f.getAttribute("src"))).toEqual(pages);
    expect(screen.queryByText("You're signed out")).toBeNull();
    fireEvent.load(frames[0]);
    expect(screen.queryByText("You're signed out")).toBeNull();
    fireEvent.load(frames[1]);
    expect(screen.getByText("You're signed out")).toBeTruthy();
  });

  it("still says so when an application's page never answers", () => {
    vi.useFakeTimers();
    render(<LoggedOutContent frontchannel={pages} />);
    expect(screen.queryByText("You're signed out")).toBeNull();
    act(() => {
      vi.advanceTimersByTime(FRONTCHANNEL_TIMEOUT_MS);
    });
    expect(screen.getByText("You're signed out")).toBeTruthy();
  });

  it("continues to the application through the API's signed ticket once the pages have loaded", () => {
    const { container } = render(<LoggedOutContent frontchannel={[pages[0]]} continueTicket="tkt" />);
    expect(goTo).not.toHaveBeenCalled();
    fireEvent.load(container.querySelector("iframe") as HTMLIFrameElement);
    expect(goTo).toHaveBeenCalledWith(`${TEST_API}/v1/oauth/logout/continue?ticket=tkt`);
  });

  it("loads nothing that isn't a web page", () => {
    const { container } = render(<LoggedOutContent frontchannel={["javascript:alert(1)"]} />);
    expect(container.querySelectorAll("iframe")).toHaveLength(0);
    expect(screen.getByText("You're signed out")).toBeTruthy();
  });
});
