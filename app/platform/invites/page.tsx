import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";

import db from "@/db/drizzle";
import { schools, teacherInvites } from "@/db/schema";
import { isAdmin } from "@/lib/adminAuth";
import { Button } from "@/components/ui/button";
import { InviteManager } from "./invite-manager";

type Props = {
  searchParams?: { schoolId?: string };
};

const getInviteStatus = (
  invite: {
    redeemedAt: Date | null;
    revokedAt: Date | null;
    expiresAt: Date;
  },
  now: Date,
): "open" | "redeemed" | "expired" | "revoked" => {
  if (invite.redeemedAt) {
    return "redeemed";
  }
  if (invite.revokedAt) {
    return "revoked";
  }
  if (invite.expiresAt <= now) {
    return "expired";
  }
  return "open";
};

const PlatformInvitesPage = async ({ searchParams }: Props) => {
  if (!(await isAdmin())) {
    redirect("/");
  }

  const allSchools = await db
    .select({ id: schools.id, name: schools.name })
    .from(schools)
    .orderBy(schools.name);
  const requestedSchoolId = Number(searchParams?.schoolId);
  const selectedSchool =
    allSchools.find((school) => school.id === requestedSchoolId) ??
    allSchools[0];

  const invites = selectedSchool
    ? await db
        .select({
          id: teacherInvites.id,
          createdAt: teacherInvites.createdAt,
          expiresAt: teacherInvites.expiresAt,
          redeemedAt: teacherInvites.redeemedAt,
          revokedAt: teacherInvites.revokedAt,
        })
        .from(teacherInvites)
        .where(eq(teacherInvites.schoolId, selectedSchool.id))
        .orderBy(desc(teacherInvites.createdAt))
    : [];
  const now = new Date();

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-extrabold text-neutral-700">
        Teacher invites
      </h1>
      <div className="mt-4">
        <Link href="/platform/schools">
          <Button variant="default">Schools and licences</Button>
        </Link>
      </div>
      {selectedSchool ? (
        <InviteManager
          schools={allSchools}
          selectedSchoolId={selectedSchool.id}
          invites={invites.map((invite) => ({
            id: invite.id,
            createdAt: invite.createdAt.toISOString(),
            expiresAt: invite.expiresAt.toISOString(),
            status: getInviteStatus(invite, now),
          }))}
        />
      ) : (
        <p className="mt-6 text-slate-600">No schools have been created yet.</p>
      )}
    </main>
  );
};

export default PlatformInvitesPage;
