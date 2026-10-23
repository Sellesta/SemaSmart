import { auth, currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";

import db from "@/db/drizzle";
import { schoolLicenses, schoolMemberships, schools } from "@/db/schema";
import {
  getBestLicenceStatus,
  type LicenceStatus,
} from "./licenceStatus";

export type SchoolAccessStatus = "no_membership" | LicenceStatus;

export const getSchoolAccessStatus = async (
  today: Date = new Date(),
): Promise<SchoolAccessStatus> => {
  const { userId } = await auth();

  if (!userId) {
    return "no_membership";
  }

  const user = await currentUser();
  if (user?.publicMetadata.role === "admin") {
    return "active";
  }

  const membership = await db.query.schoolMemberships.findFirst({
    where: eq(schoolMemberships.userId, userId),
  });

  if (!membership) {
    return "no_membership";
  }

  const school = await db.query.schools.findFirst({
    where: eq(schools.id, membership.schoolId),
    columns: { isActive: true },
  });

  if (!school?.isActive) {
    return "expired";
  }

  const licences = await db.query.schoolLicenses.findMany({
    where: eq(schoolLicenses.schoolId, membership.schoolId),
  });

  return getBestLicenceStatus(licences, today);
};
