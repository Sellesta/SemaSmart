import type { SchoolAccessStatus, SchoolMemberRole } from "./schoolAccess";

export type SchoolAccessDecision = {
  redirectTo: "/join" | "/expired" | null;
  showRenewalNotice: boolean;
};

export const getSchoolAccessDecision = (
  status: SchoolAccessStatus,
  role: SchoolMemberRole | null = null,
): SchoolAccessDecision => ({
  redirectTo:
    status === "no_membership"
      ? "/join"
      : status === "expired"
        ? "/expired"
        : null,
  showRenewalNotice: status === "grace" && role === "teacher",
});
