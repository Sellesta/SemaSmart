"use server";

import { auth } from "@clerk/nextjs/server";
import { and, eq, gt, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import db from "@/db/drizzle";
import { schools, teacherInvites } from "@/db/schema";
import { isAdmin } from "@/lib/adminAuth";
import {
  generateInviteCode,
  hashInviteCode,
} from "@/lib/teacherInviteCodes";

const requirePlatformAdmin = async (): Promise<string> => {
  const { userId } = await auth();
  if (!userId || !(await isAdmin())) {
    throw new Error("Platform admin access required");
  }
  return userId;
};

const requirePositiveSchoolId = (schoolId: unknown): number => {
  if (
    typeof schoolId !== "number" ||
    !Number.isInteger(schoolId) ||
    schoolId <= 0
  ) {
    throw new RangeError("School id must be a positive integer");
  }
  return schoolId;
};

const getInviteCodeSecret = (): string => {
  const secret = process.env.INVITE_CODE_SECRET;
  if (!secret) {
    throw new Error("INVITE_CODE_SECRET is required");
  }
  return secret;
};

export const createTeacherInvite = async (
  schoolIdInput: unknown,
): Promise<{ code: string }> => {
  const adminUserId = await requirePlatformAdmin();
  const schoolId = requirePositiveSchoolId(schoolIdInput);
  const [school] = await db
    .select({ id: schools.id })
    .from(schools)
    .where(eq(schools.id, schoolId))
    .limit(1);

  if (!school) {
    throw new Error("School not found");
  }

  const secret = getInviteCodeSecret();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = generateInviteCode();
    const codeHash = hashInviteCode(code, secret);
    const [createdInvite] = await db
      .insert(teacherInvites)
      .values({
        schoolId,
        codeHash,
        createdByUserId: adminUserId,
        expiresAt,
      })
      .onConflictDoNothing({ target: teacherInvites.codeHash })
      .returning({ id: teacherInvites.id });

    if (createdInvite) {
      revalidatePath("/platform/invites");
      return { code };
    }
  }

  throw new Error("Unable to generate a unique teacher invite code");
};

export const revokeTeacherInvite = async (
  inviteIdInput: unknown,
  schoolIdInput: unknown,
): Promise<void> => {
  await requirePlatformAdmin();
  const inviteId = requirePositiveSchoolId(inviteIdInput);
  const schoolId = requirePositiveSchoolId(schoolIdInput);
  const now = new Date();
  const [revokedInvite] = await db
    .update(teacherInvites)
    .set({ revokedAt: now })
    .where(
      and(
        eq(teacherInvites.id, inviteId),
        eq(teacherInvites.schoolId, schoolId),
        isNull(teacherInvites.redeemedAt),
        isNull(teacherInvites.revokedAt),
        gt(teacherInvites.expiresAt, now),
      ),
    )
    .returning({ id: teacherInvites.id });

  if (!revokedInvite) {
    throw new Error("Only open invites can be revoked");
  }

  revalidatePath("/platform/invites");
};
