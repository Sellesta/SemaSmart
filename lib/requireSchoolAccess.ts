import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import {
  getSchoolAccessStatus,
  getSchoolMembershipRole,
} from "@/lib/schoolAccess";
import { getSchoolAccessDecision } from "@/lib/schoolAccessDecision";

export const requireSchoolAccess = cache(async () => {
  const status = await getSchoolAccessStatus();
  const role = status === "grace" ? await getSchoolMembershipRole() : null;
  const decision = getSchoolAccessDecision(status, role);

  if (decision.redirectTo) {
    redirect(decision.redirectTo);
  }

  return decision;
});
