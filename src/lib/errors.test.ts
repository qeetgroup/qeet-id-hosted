import { describe, expect, it } from "vitest";
import i18n from "@/i18n";
import { ApiError } from "@/lib/api";

import { apiErrorMessage, isAddressRefusal } from "./errors";

const t = (key: string) => i18n.t(key);

describe("apiErrorMessage", () => {
  it("gives an address refusal the one network message, naming no rule", () => {
    const err = new ApiError(403, "auth.address_not_allowed", "blocked by deny rule 192.0.2.0/24");
    expect(isAddressRefusal(err)).toBe(true);
    const msg = apiErrorMessage(err, t, "fallback");
    expect(msg).toBe(
      "Your organisation doesn't allow sign-in from this network. Contact your administrator.",
    );
    expect(msg).not.toMatch(/192\.0\.2|rule|range|list/i);
  });

  it("keeps the API's message for other refusals, and the fallback for anything else", () => {
    expect(
      apiErrorMessage(
        new ApiError(401, "auth.invalid_credentials", "Invalid email or password."),
        t,
        "x",
      ),
    ).toBe("Invalid email or password.");
    expect(apiErrorMessage(new TypeError("Failed to fetch"), t, "Something went wrong.")).toBe(
      "Something went wrong.",
    );
    expect(isAddressRefusal(new ApiError(403, "auth.method_disabled", "off"))).toBe(false);
  });
});
