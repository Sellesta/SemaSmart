import type { LicenceRecord, LicenceStatus } from "./licenceStatus";
import { getBestLicenceStatus } from "./licenceStatus";

export type LicenceInput = {
  tierLabel: string;
  studentCap: number;
  startsAt: string;
  endsAt: string;
  graceDays: number;
  invoiceReference: string | null;
  paidAt: string | null;
};

export type LicenceInputResult =
  | { valid: true; value: LicenceInput }
  | { valid: false; error: string };

export const validateSchoolName = (value: unknown): string => {
  if (typeof value !== "string") {
    throw new TypeError("School name must be text");
  }
  const name = value.trim();
  if (name.length < 1 || name.length > 100) {
    throw new RangeError("School name must be between 1 and 100 characters");
  }
  return name;
};

const isValidDate = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

export const validateLicenceInput = (input: {
  tierLabel: unknown;
  studentCap: unknown;
  startsAt: unknown;
  endsAt: unknown;
  graceDays: unknown;
  invoiceReference: unknown;
  paidAt: unknown;
}): LicenceInputResult => {
  if (typeof input.tierLabel !== "string" || !input.tierLabel.trim()) {
    return { valid: false, error: "Choose a licence tier." };
  }
  if (
    typeof input.studentCap !== "number" ||
    !Number.isInteger(input.studentCap) ||
    input.studentCap <= 0
  ) {
    return { valid: false, error: "Student cap must be a positive integer." };
  }
  if (
    typeof input.startsAt !== "string" ||
    !isValidDate(input.startsAt) ||
    typeof input.endsAt !== "string" ||
    !isValidDate(input.endsAt)
  ) {
    return { valid: false, error: "Enter valid start and end dates." };
  }
  if (input.startsAt > input.endsAt) {
    return { valid: false, error: "Start date must be on or before end date." };
  }
  if (
    typeof input.graceDays !== "number" ||
    !Number.isInteger(input.graceDays) ||
    input.graceDays < 0
  ) {
    return { valid: false, error: "Grace days must be a nonnegative integer." };
  }
  if (
    input.invoiceReference !== null &&
    typeof input.invoiceReference !== "string"
  ) {
    return { valid: false, error: "Invoice reference must be text." };
  }
  if (input.paidAt !== null && (typeof input.paidAt !== "string" || !isValidDate(input.paidAt))) {
    return { valid: false, error: "Enter a valid paid date." };
  }

  return {
    valid: true,
    value: {
      tierLabel: input.tierLabel.trim(),
      studentCap: input.studentCap,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      graceDays: input.graceDays,
      invoiceReference:
        typeof input.invoiceReference === "string" &&
        input.invoiceReference.trim()
          ? input.invoiceReference.trim()
          : null,
      paidAt: input.paidAt === "" ? null : input.paidAt,
    },
  };
};

export const licenceOverlaps = (
  startsAt: string,
  endsAt: string,
  existing: Array<{ id?: number; startsAt: string; endsAt: string }>,
  exceptId?: number,
): boolean =>
  existing.some(
    (licence) =>
      licence.id !== exceptId &&
      startsAt <= licence.endsAt &&
      endsAt >= licence.startsAt,
  );

export const getSchoolLicenceStatus = (
  licences: LicenceRecord[],
  isActive: boolean,
  today: Date,
): LicenceStatus | "none" => {
  if (licences.length === 0) {
    return "none";
  }
  if (!isActive) {
    return "expired";
  }
  return getBestLicenceStatus(licences, today);
};

export const getRenewalDates = (latestEndsAt: string | null, today: Date) => {
  const startsAt = latestEndsAt
    ? addDays(latestEndsAt, 1)
    : today.toISOString().slice(0, 10);
  return {
    startsAt,
    endsAt: addDays(addYears(startsAt, 1), -1),
  };
};

const addDays = (value: string, days: number): string => {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const addYears = (value: string, years: number): string => {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCFullYear(date.getUTCFullYear() + years);
  return date.toISOString().slice(0, 10);
};
