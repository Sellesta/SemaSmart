"use server";

import { auth } from "@clerk/nextjs/server";
import { and, count, desc, eq, ne, sql } from "drizzle-orm";

import transactionalDb from "@/db/transactional";
import {
  classMemberships,
  classes,
  schoolLicenses,
  schoolMemberships,
  schools,
} from "@/db/schema";
import {
  generateClassCode,
  isValidClassCode,
  normalizeClassCode,
} from "@/lib/classCodes";
import { getLicenceStatus } from "@/lib/licenceStatus";

export type JoinClassResult =
  | { status: "ok"; classId: number }
  | { status: "invalid_code" }
  | { status: "licence_expired" }
  | { status: "seat_cap_reached" }
  | { status: "other_school" };

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

export const joinClassByCode = async (code: string): Promise<JoinClassResult> => {
  const userId = await requireUserId();
  const normalizedCode = normalizeClassCode(code);

  if (!isValidClassCode(normalizedCode)) {
    return { status: "invalid_code" };
  }

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
      throw new Error("Only student memberships can join a class");
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
        throw new Error("Only student memberships can join a class");
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
  name: string,
): Promise<{ id: number; joinCode: string }> => {
  const userId = await requireUserId();
  const className = name.trim();
  if (!className) {
    throw new RangeError("Class name is required");
  }

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

export const regenerateClassCode = async (
  classId: number,
): Promise<{ joinCode: string }> => {
  const userId = await requireUserId();

  return transactionalDb.transaction(async (tx) => {
    const schoolId = await requireTeacherSchoolId(tx, userId);
    const [classRecord] = await tx
      .select({ id: classes.id })
      .from(classes)
      .where(and(eq(classes.id, classId), eq(classes.schoolId, schoolId)))
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
        .where(and(eq(classes.joinCode, joinCode), ne(classes.id, classId)))
        .limit(1);

      if (collision) {
        continue;
      }

      const [updatedClass] = await tx
        .update(classes)
        .set({ joinCode })
        .where(eq(classes.id, classId))
        .returning({ joinCode: classes.joinCode });

      if (updatedClass) {
        return updatedClass;
      }
    }

    throw new Error("Unable to generate a unique class code");
  });
};

export const archiveClass = async (classId: number): Promise<void> => {
  const userId = await requireUserId();

  await transactionalDb.transaction(async (tx) => {
    const schoolId = await requireTeacherSchoolId(tx, userId);
    const [archivedClass] = await tx
      .update(classes)
      .set({ isActive: false })
      .where(and(eq(classes.id, classId), eq(classes.schoolId, schoolId)))
      .returning({ id: classes.id });

    if (!archivedClass) {
      throw new Error("Class not found in teacher's school");
    }
  });
};
