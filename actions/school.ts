"use server";

import { auth } from "@clerk/nextjs/server";
import { and, count, desc, eq, gt, isNull, ne, sql } from "drizzle-orm";

import transactionalDb from "@/db/transactional";
import {
  classMemberships,
  classes,
  schoolLicenses,
  schoolMemberships,
  schools,
  teacherInvites,
} from "@/db/schema";
import {
  generateClassCode,
  isValidClassCode,
  normalizeClassCode,
} from "@/lib/classCodes";
import { getLicenceStatus } from "@/lib/licenceStatus";
import {
  hashInviteCode,
  isValidInviteCode,
  normalizeInviteCode,
} from "@/lib/teacherInviteCodes";

export type JoinClassResult =
  | { status: "ok"; classId: number }
  | { status: "invalid_code" }
  | { status: "licence_expired" }
  | { status: "seat_cap_reached" }
  | { status: "other_school" }
  | { status: "teacher_account" };

export type RedeemTeacherInviteResult =
  | { status: "ok" }
  | { status: "invalid_code" }
  | { status: "other_school" }
  | { status: "already_student" };

const maxClassCodeAttempts = 10;

const requireUserId = async (): Promise<string> => {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Authentication required");
  }
  return userId;
};

const requireTeacherSchoolId = async (
  tx: Parameters<Parameters<typeof transactionalDb.transaction>[0]>[0],
  userId: string,
): Promise<number> => {
  const [membership] = await tx
    .select({ schoolId: schoolMemberships.schoolId })
    .from(schoolMemberships)
    .where(
      and(
        eq(schoolMemberships.userId, userId),
        eq(schoolMemberships.role, "teacher"),
      ),
    )
    .for("share")
    .limit(1);

  if (!membership) {
    throw new Error("Teacher membership required");
  }

  return membership.schoolId;
};

const lockClassCode = async (
  tx: Parameters<Parameters<typeof transactionalDb.transaction>[0]>[0],
  code: string,
) => {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${code}))`);
};

class InviteRedemptionRejected extends Error {
  constructor(readonly result: RedeemTeacherInviteResult) {
    super(result.status);
  }
}

const getInviteCodeSecret = (): string => {
  const secret = process.env.INVITE_CODE_SECRET;
  if (!secret) {
    throw new Error("INVITE_CODE_SECRET is required");
  }
  return secret;
};

export const redeemTeacherInvite = async (
  code: unknown,
): Promise<RedeemTeacherInviteResult> => {
  if (typeof code !== "string") {
    return { status: "invalid_code" };
  }

  const normalizedCode = normalizeInviteCode(code);
  if (!isValidInviteCode(normalizedCode)) {
    return { status: "invalid_code" };
  }

  const userId = await requireUserId();
  const codeHash = hashInviteCode(normalizedCode, getInviteCodeSecret());
  const now = new Date();

  try {
    return await transactionalDb.transaction(async (tx) => {
      const [claimedInvite] = await tx
        .update(teacherInvites)
        .set({ redeemedAt: now, redeemedByUserId: userId })
        .where(
          and(
            eq(teacherInvites.codeHash, codeHash),
            isNull(teacherInvites.redeemedAt),
            isNull(teacherInvites.revokedAt),
            gt(teacherInvites.expiresAt, now),
          ),
        )
        .returning({ schoolId: teacherInvites.schoolId });

      if (!claimedInvite) {
        return { status: "invalid_code" };
      }

      await tx
        .select({ id: schools.id })
        .from(schools)
        .where(eq(schools.id, claimedInvite.schoolId))
        .for("update")
        .limit(1);

      const [membership] = await tx
        .select({
          schoolId: schoolMemberships.schoolId,
          role: schoolMemberships.role,
        })
        .from(schoolMemberships)
        .where(eq(schoolMemberships.userId, userId))
        .limit(1);

      if (
        membership?.schoolId &&
        membership.schoolId !== claimedInvite.schoolId
      ) {
        throw new InviteRedemptionRejected({ status: "other_school" });
      }
      if (membership?.role === "student") {
        throw new InviteRedemptionRejected({ status: "already_student" });
      }

      if (!membership) {
        const [insertedMembership] = await tx
          .insert(schoolMemberships)
          .values({
            schoolId: claimedInvite.schoolId,
            userId,
            role: "teacher",
          })
          .onConflictDoNothing()
          .returning({ schoolId: schoolMemberships.schoolId });

        if (!insertedMembership) {
          const [concurrentMembership] = await tx
            .select({
              schoolId: schoolMemberships.schoolId,
              role: schoolMemberships.role,
            })
            .from(schoolMemberships)
            .where(eq(schoolMemberships.userId, userId))
            .limit(1);

          if (concurrentMembership?.schoolId !== claimedInvite.schoolId) {
            throw new InviteRedemptionRejected({ status: "other_school" });
          }
          if (concurrentMembership.role === "student") {
            throw new InviteRedemptionRejected({ status: "already_student" });
          }
        }
      }

      return { status: "ok" };
    });
  } catch (error) {
    if (error instanceof InviteRedemptionRejected) {
      return error.result;
    }
    throw error;
  }
};

export const joinClassByCode = async (
  code: unknown,
): Promise<JoinClassResult> => {
  if (typeof code !== "string") {
    return { status: "invalid_code" };
  }

  const normalizedCode = normalizeClassCode(code);

  if (!isValidClassCode(normalizedCode)) {
    return { status: "invalid_code" };
  }

  const userId = await requireUserId();

  return transactionalDb.transaction(async (tx) => {
    const [classRecord] = await tx
      .select({ id: classes.id, schoolId: classes.schoolId })
      .from(classes)
      .where(
        and(
          eq(classes.joinCode, normalizedCode),
          eq(classes.isActive, true),
        ),
      )
      .for("share")
      .limit(1);

    if (!classRecord) {
      return { status: "invalid_code" };
    }

    const [school] = await tx
      .select({ id: schools.id, isActive: schools.isActive })
      .from(schools)
      .where(eq(schools.id, classRecord.schoolId))
      .for("update")
      .limit(1);

    if (!school?.isActive) {
      return { status: "licence_expired" };
    }

    const [existingMembership] = await tx
      .select({
        schoolId: schoolMemberships.schoolId,
        role: schoolMemberships.role,
      })
      .from(schoolMemberships)
      .where(eq(schoolMemberships.userId, userId))
      .limit(1);

    if (
      existingMembership &&
      existingMembership.schoolId !== classRecord.schoolId
    ) {
      return { status: "other_school" };
    }
    if (existingMembership?.role === "teacher") {
      return { status: "teacher_account" };
    }

    const licences = await tx
      .select()
      .from(schoolLicenses)
      .where(eq(schoolLicenses.schoolId, classRecord.schoolId))
      .orderBy(desc(schoolLicenses.endsAt), desc(schoolLicenses.id));
    const today = new Date();
    const eligibleLicence =
      licences.find((licence) => getLicenceStatus(licence, today) === "active") ??
      licences.find((licence) => getLicenceStatus(licence, today) === "grace");

    if (!eligibleLicence) {
      return { status: "licence_expired" };
    }

    if (existingMembership) {
      await tx
        .insert(classMemberships)
        .values({
          classId: classRecord.id,
          schoolId: classRecord.schoolId,
          userId,
        })
        .onConflictDoNothing();

      return { status: "ok", classId: classRecord.id };
    }

    const [studentCount] = await tx
      .select({ value: count() })
      .from(schoolMemberships)
      .where(
        and(
          eq(schoolMemberships.schoolId, classRecord.schoolId),
          eq(schoolMemberships.role, "student"),
        ),
      );

    if (studentCount.value >= eligibleLicence.studentCap) {
      return { status: "seat_cap_reached" };
    }

    const [createdMembership] = await tx
      .insert(schoolMemberships)
      .values({
        schoolId: classRecord.schoolId,
        userId,
        role: "student",
      })
      .onConflictDoNothing()
      .returning({ schoolId: schoolMemberships.schoolId });

    if (!createdMembership) {
      const [concurrentMembership] = await tx
        .select({
          schoolId: schoolMemberships.schoolId,
          role: schoolMemberships.role,
        })
        .from(schoolMemberships)
        .where(eq(schoolMemberships.userId, userId))
        .limit(1);

      if (concurrentMembership?.schoolId !== classRecord.schoolId) {
        return { status: "other_school" };
      }
      if (concurrentMembership.role !== "student") {
        return { status: "teacher_account" };
      }
    }

    await tx
      .insert(classMemberships)
      .values({
        classId: classRecord.id,
        schoolId: classRecord.schoolId,
        userId,
      })
      .onConflictDoNothing();

    return { status: "ok", classId: classRecord.id };
  });
};

export const createClass = async (
  name: unknown,
): Promise<{ id: number; joinCode: string }> => {
  if (typeof name !== "string") {
    throw new TypeError("Class name must be a string");
  }

  const className = name.trim();
  if (className.length < 1 || className.length > 100) {
    throw new RangeError("Class name must be between 1 and 100 characters");
  }

  const userId = await requireUserId();

  return transactionalDb.transaction(async (tx) => {
    const schoolId = await requireTeacherSchoolId(tx, userId);

    for (let attempt = 0; attempt < maxClassCodeAttempts; attempt += 1) {
      const joinCode = generateClassCode();
      await lockClassCode(tx, joinCode);

      const [createdClass] = await tx
        .insert(classes)
        .values({
          schoolId,
          createdByUserId: userId,
          name: className,
          joinCode,
        })
        .onConflictDoNothing({ target: classes.joinCode })
        .returning({ id: classes.id, joinCode: classes.joinCode });

      if (createdClass) {
        return createdClass;
      }
    }

    throw new Error("Unable to generate a unique class code");
  });
};

const requirePositiveClassId = (classId: unknown): number => {
  if (
    typeof classId !== "number" ||
    !Number.isInteger(classId) ||
    classId <= 0
  ) {
    throw new RangeError("Class id must be a positive integer");
  }
  return classId;
};

// Any teacher of the school may manage any class in that school, deliberately.
export const regenerateClassCode = async (
  classId: unknown,
): Promise<{ joinCode: string }> => {
  const validClassId = requirePositiveClassId(classId);
  const userId = await requireUserId();

  return transactionalDb.transaction(async (tx) => {
    const schoolId = await requireTeacherSchoolId(tx, userId);
    const [classRecord] = await tx
      .select({ id: classes.id })
      .from(classes)
      .where(and(eq(classes.id, validClassId), eq(classes.schoolId, schoolId)))
      .for("update")
      .limit(1);

    if (!classRecord) {
      throw new Error("Class not found in teacher's school");
    }

    for (let attempt = 0; attempt < maxClassCodeAttempts; attempt += 1) {
      const joinCode = generateClassCode();
      await lockClassCode(tx, joinCode);

      const [collision] = await tx
        .select({ id: classes.id })
        .from(classes)
        .where(and(eq(classes.joinCode, joinCode), ne(classes.id, validClassId)))
        .limit(1);

      if (collision) {
        continue;
      }

      const [updatedClass] = await tx
        .update(classes)
        .set({ joinCode })
        .where(eq(classes.id, validClassId))
        .returning({ joinCode: classes.joinCode });

      if (updatedClass) {
        return updatedClass;
      }
    }

    throw new Error("Unable to generate a unique class code");
  });
};

// Any teacher of the school may manage any class in that school, deliberately.
export const archiveClass = async (classId: unknown): Promise<void> => {
  const validClassId = requirePositiveClassId(classId);
  const userId = await requireUserId();

  await transactionalDb.transaction(async (tx) => {
    const schoolId = await requireTeacherSchoolId(tx, userId);
    const [archivedClass] = await tx
      .update(classes)
      .set({ isActive: false })
      .where(
        and(eq(classes.id, validClassId), eq(classes.schoolId, schoolId)),
      )
      .returning({ id: classes.id });

    if (!archivedClass) {
      throw new Error("Class not found in teacher's school");
    }
  });
};
