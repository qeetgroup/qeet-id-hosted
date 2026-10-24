import { describe, expect, it } from "vitest";

import { clientIdFromReturnTo } from "../login-context";

const API = "https://api.id.example";
const AUTHORIZE = `${API}/oauth/authorize?client_id=app-1&redirect_uri=https%3A%2F%2Fapp.example%2Fcb`;

describe("clientIdFromReturnTo", () => {
  it("reads the client from an authorize URL", () => {
    expect(clientIdFromReturnTo(AUTHORIZE)).toBe("app-1");
  });

  it("is empty when there is no client to read", () => {
    expect(clientIdFromReturnTo("")).toBe("");
    expect(clientIdFromReturnTo(`${API}/oauth/authorize`)).toBe("");
  });
});
