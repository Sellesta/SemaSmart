import { describe, expect, it } from "vitest";

import { getLicenceStatus } from "./licenceStatus";

const licence = {
  startsAt: "2026-01-01",
  endsAt: "2026-01-31",
  graceDays: 30,
};

const date = (value: string) => new Date(`${value}T00:00:00.000Z`);

describe("getLicenceStatus", () => {
  it("is active from the start date through the end date", () => {
    expect(getLicenceStatus(licence, date("2026-01-01"))).toBe("active");
    expect(getLicenceStatus(licence, date("2026-01-31"))).toBe("active");
  });

  it("is in grace for the configured days after the end date", () => {
    expect(getLicenceStatus(licence, date("2026-02-01"))).toBe("grace");
    expect(getLicenceStatus(licence, date("2026-03-02"))).toBe("grace");
  });

  it("expires after the grace period", () => {
    expect(getLicenceStatus(licence, date("2026-03-03"))).toBe("expired");
  });

  it("does not grant access before the start date", () => {
    expect(getLicenceStatus(licence, date("2025-12-31"))).toBe("expired");
  });

  it("expires immediately after the end date when grace is zero", () => {
    expect(
      getLicenceStatus({ ...licence, graceDays: 0 }, date("2026-02-01")),
    ).toBe("expired");
  });

  it("rejects an invalid current date", () => {
    expect(() => getLicenceStatus(licence, new Date(Number.NaN))).toThrow(
      RangeError,
    );
  });
});
