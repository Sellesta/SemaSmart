"use server";

import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import db from "@/db/drizzle";
import { schoolLicenses, schools } from "@/db/schema";
import { isAdmin } from "@/lib/adminAuth";
import {
  validateLicenceInput,
  validateSchoolName,
} from "@/lib/schoolLicenceAdmin";

const requirePlatformAdmin = async (): Promise<void> => {
  const { userId } = await auth();
  if (!userId || !(await isAdmin())) {
    throw new Error("Platform admin access required");
  }
};

const requirePositiveId = (value: unknown, label: string): number => {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new RangeError(`${label} must be a positive integer`);
  }
  return value;
};

const validateLicence = (input: {
  tierLabel: unknown;
  studentCap: unknown;
  startsAt: unknown;
  endsAt: unknown;
  graceDays: unknown;
  invoiceReference: unknown;
  paidAt: unknown;
}) => {
  const result = validateLicenceInput(input);
  if (!result.valid) {
    throw new RangeError(result.error);
  }
  return result.value;
};

export const createSchool = async (nameInput: unknown): Promise<void> => {
  await requirePlatformAdmin();
  const name = validateSchoolName(nameInput);
  await db.insert(schools).values({ name });
  revalidatePath("/platform/schools");
};

export const updateSchoolName = async (
  schoolIdInput: unknown,
  nameInput: unknown,
): Promise<void> => {
  await requirePlatformAdmin();
  const schoolId = requirePositiveId(schoolIdInput, "School id");
  const name = validateSchoolName(nameInput);
  const [updated] = await db
    .update(schools)
    .set({ name })
    .where(eq(schools.id, schoolId))
    .returning({ id: schools.id });

  if (!updated) {
    throw new Error("School not found");
  }

  revalidatePath("/platform/schools");
  revalidatePath(`/platform/schools/${schoolId}`);
};

export const setSchoolActive = async (
  schoolIdInput: unknown,
  isActiveInput: unknown,
): Promise<void> => {
  await requirePlatformAdmin();
  const schoolId = requirePositiveId(schoolIdInput, "School id");
  if (typeof isActiveInput !== "boolean") {
    throw new TypeError("School active state must be a boolean");
  }

  const [updated] = await db
    .update(schools)
    .set({ isActive: isActiveInput })
    .where(eq(schools.id, schoolId))
    .returning({ id: schools.id });

  if (!updated) {
    throw new Error("School not found");
  }

  revalidatePath("/platform/schools");
  revalidatePath(`/platform/schools/${schoolId}`);
};

export const createSchoolLicence = async (
  schoolIdInput: unknown,
  tierLabel: unknown,
  studentCap: unknown,
  startsAt: unknown,
  endsAt: unknown,
  graceDays: unknown,
  invoiceReference: unknown,
  paidAt: unknown,
): Promise<void> => {
  await requirePlatformAdmin();
  const schoolId = requirePositiveId(schoolIdInput, "School id");
  const licence = validateLicence({
    tierLabel,
    studentCap,
    startsAt,
    endsAt,
    graceDays,
    invoiceReference,
    paidAt,
  });

  const [school] = await db
    .select({ id: schools.id })
    .from(schools)
    .where(eq(schools.id, schoolId))
    .limit(1);
  if (!school) {
    throw new Error("School not found");
  }

  await db.insert(schoolLicenses).values({
    schoolId,
    tierLabel: licence.tierLabel,
    studentCap: licence.studentCap,
    startsAt: licence.startsAt,
    endsAt: licence.endsAt,
    graceDays: licence.graceDays,
    invoiceReference: licence.invoiceReference,
    paidAt: licence.paidAt,
  });
  revalidatePath(`/platform/schools/${schoolId}`);
  revalidatePath("/platform/schools");
};

export const updateSchoolLicence = async (
  schoolIdInput: unknown,
  licenceIdInput: unknown,
  tierLabel: unknown,
  studentCap: unknown,
  startsAt: unknown,
  endsAt: unknown,
  graceDays: unknown,
  invoiceReference: unknown,
  paidAt: unknown,
): Promise<void> => {
  await requirePlatformAdmin();
  const schoolId = requirePositiveId(schoolIdInput, "School id");
  const licenceId = requirePositiveId(licenceIdInput, "Licence id");
  const licence = validateLicence({
    tierLabel,
    studentCap,
    startsAt,
    endsAt,
    graceDays,
    invoiceReference,
    paidAt,
  });

  const [updated] = await db
    .update(schoolLicenses)
    .set({
      tierLabel: licence.tierLabel,
      studentCap: licence.studentCap,
      startsAt: licence.startsAt,
      endsAt: licence.endsAt,
      graceDays: licence.graceDays,
      invoiceReference: licence.invoiceReference,
      paidAt: licence.paidAt,
    })
    .where(
      and(
        eq(schoolLicenses.id, licenceId),
        eq(schoolLicenses.schoolId, schoolId),
      ),
    )
    .returning({ id: schoolLicenses.id });

  if (!updated) {
    throw new Error("Licence not found for this school");
  }

  revalidatePath(`/platform/schools/${schoolId}`);
  revalidatePath("/platform/schools");
};
