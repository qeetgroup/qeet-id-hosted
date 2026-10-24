import { describe, expect, it } from "vitest";

import { readSocialChallenge } from "./social-challenge";

describe("readSocialChallenge", () => {
  it("reads the challenge, its factors and an enrolment from the fragment", () => {
    const factors = JSON.stringify([{ type: "email", id: "f-1", destination: "a***@example.com" }]);
    expect(
      readSocialChallenge(
        `#${new URLSearchParams({ mfa_token: "t", methods: "email", factors, enrollment_required: "true", enrollment_due_at: "2026-11-01T00:00:00Z" })}`,
      ),
    ).toEqual({
      mfaToken: "t",
      factors: [{ type: "email", id: "f-1", destination: "a***@example.com" }],
      enrollment: { dueAt: "2026-11-01T00:00:00Z" },
    });
  });

  it("falls back to the methods that need no factor id, and drops unknown factors", () => {
    expect(readSocialChallenge("#mfa_token=t&methods=totp,email,push,bogus")?.factors).toEqual([
      { type: "totp" },
      { type: "push" },
    ]);
    expect(
      readSocialChallenge(
        `#${new URLSearchParams({ mfa_token: "t", factors: JSON.stringify([{ type: "x" }, { type: "totp" }]) })}`,
      )?.factors,
    ).toEqual([{ type: "totp" }]);
  });

  it("is null when the fragment carries no challenge", () => {
    expect(readSocialChallenge("")).toBeNull();
    expect(readSocialChallenge("#section")).toBeNull();
  });
});
