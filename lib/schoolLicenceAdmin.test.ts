import { describe, expect, it } from "vitest";

import {
  getRenewalDates,
  licenceOverlaps,
  validateLicenceInput,
  validateSchoolName,
} from "./schoolLicenceAdmin";

const validInput = {
  tierLabel: "Medium",
  studentCap: 250,
  startsAt: "2026-01-01",
  endsAt: "2026-12-31",
  graceDays: 30,
  invoiceReference: "INV-123",
  paidAt: null,
};

describe("validateLicenceInput", () => {
  it("accepts valid licence fields and normalizes optional text", () => {
    expect(
      validateLicenceInput({ ...validInput, invoiceReference: "  INV-123  " }),
    ).toEqual({
      valid: true,
      value: { ...validInput, invoiceReference: "INV-123" },
    });
  });

  it.each([
    [{ ...validInput, studentCap: 0 }, "Student cap must be a positive integer."],
    [{ ...validInput, startsAt: "2027-02-01" }, "Start date must be on or before end date."],
    [{ ...validInput, startsAt: "2026-02-30" }, "Enter valid start and end dates."],
    [{ ...validInput, graceDays: -1 }, "Grace days must be a nonnegative integer."],
    [{ ...validInput, paidAt: "not-a-date" }, "Enter a valid paid date."],
  ])("rejects invalid licence fields", (input, error) => {
    expect(validateLicenceInput(input)).toEqual({ valid: false, error });
  });

  it("treats overlapping date ranges as a warning condition", () => {
    const current = [{ id: 1, startsAt: "2026-01-01", endsAt: "2026-12-31" }];
    expect(licenceOverlaps("2026-12-31", "2027-12-30", current)).toBe(true);
    expect(
      licenceOverlaps("2027-01-01", "2027-12-31", current),
    ).toBe(false);
    expect(
      licenceOverlaps(
        "2026-01-01",
        "2026-12-31",
        current,
        1,
      ),
    ).toBe(false);
  });

  it("calculates the renewal year after the latest end date", () => {
    expect(getRenewalDates("2026-12-31", new Date("2026-04-01T00:00:00Z"))).toEqual({
      startsAt: "2027-01-01",
      endsAt: "2027-12-31",
    });
  });

  describe("validateSchoolName", () => {
    it("trims a valid school name", () => {
      expect(validateSchoolName("  Example School  ")).toBe("Example School");
    });

    it("accepts a name with exactly 100 characters", () => {
      expect(validateSchoolName("S".repeat(100))).toBe("S".repeat(100));
    });

    it("rejects empty, oversized, and non-string names", () => {
      expect(() => validateSchoolName("  ")).toThrow(RangeError);
      expect(() => validateSchoolName("S".repeat(101))).toThrow(RangeError);
      expect(() => validateSchoolName(null)).toThrow(TypeError);
    });
  });
});
