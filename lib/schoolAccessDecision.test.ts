import { describe, expect, it } from "vitest";

import { getSchoolAccessDecision } from "./schoolAccessDecision";

describe("getSchoolAccessDecision", () => {
  it("redirects users without a school membership to join", () => {
    expect(getSchoolAccessDecision("no_membership")).toEqual({
      redirectTo: "/join",
      showRenewalNotice: false,
    });
  });

  it("redirects users with an expired licence", () => {
    expect(getSchoolAccessDecision("expired")).toEqual({
      redirectTo: "/expired",
      showRenewalNotice: false,
    });
  });

  it("allows active and grace users without a redirect", () => {
    expect(getSchoolAccessDecision("active").redirectTo).toBeNull();
    expect(getSchoolAccessDecision("grace", "student").redirectTo).toBeNull();
  });

  it("shows the renewal notice only to teachers during grace", () => {
    expect(getSchoolAccessDecision("grace", "teacher").showRenewalNotice).toBe(
      true,
    );
    expect(getSchoolAccessDecision("grace", "student").showRenewalNotice).toBe(
      false,
    );
    expect(getSchoolAccessDecision("active", "teacher").showRenewalNotice).toBe(
      false,
    );
  });
});
