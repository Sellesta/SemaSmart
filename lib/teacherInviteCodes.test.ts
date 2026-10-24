import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

import {
  hashInviteCode,
  isValidInviteCode,
  normalizeInviteCode,
} from "./teacherInviteCodes";

describe("teacher invite code helpers", () => {
  it("normalizes case, whitespace, and hyphens", () => {
    expect(normalizeInviteCode(" ab-cd ef-gh jk mn ")).toBe("ABCDEFGHJKMN");
  });

  it("validates twelve-character codes against the unambiguous alphabet", () => {
    expect(isValidInviteCode("ABCDEFGHJKMN")).toBe(true);
    expect(isValidInviteCode("ABCD0FGHJKMN")).toBe(false);
    expect(isValidInviteCode("ABCDEFGHJKM")).toBe(false);
  });

  it("hashes the normalized code as HMAC-SHA256 hex", () => {
    const expected = createHmac("sha256", "test-secret")
      .update("ABCDEFGHJKMN", "utf8")
      .digest("hex");

    expect(hashInviteCode("ab-cd ef-gh jk mn", "test-secret")).toBe(expected);
    expect(hashInviteCode("ABCDEFGHJKMN", "other-secret")).not.toBe(expected);
  });

  it("rejects an empty secret", () => {
    expect(() => hashInviteCode("ABCDEFGHJKMN", "")).toThrow(
      "INVITE_CODE_SECRET is required",
    );
  });
});
