import Link from "next/link";
import { and, count, desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import db from "@/db/drizzle";
import { schoolLicenses, schoolMemberships, schools } from "@/db/schema";
import { isAdmin } from "@/lib/adminAuth";
import { getSchoolLicenceStatus } from "@/lib/schoolLicenceAdmin";
import { Button } from "@/components/ui/button";
import { CreateSchoolForm } from "./school-forms";

const PlatformSchoolsPage = async () => {
  if (!(await isAdmin())) {
    redirect("/");
  }

  const rows = await db
    .select({
      id: schools.id,
      name: schools.name,
      isActive: schools.isActive,
    })
    .from(schools)
    .orderBy(schools.name);
  const today = new Date();
  const schoolRows = await Promise.all(
    rows.map(async (school) => {
      const [licences, [seatResult]] = await Promise.all([
        db
          .select()
          .from(schoolLicenses)
          .where(eq(schoolLicenses.schoolId, school.id))
          .orderBy(desc(schoolLicenses.endsAt), desc(schoolLicenses.id)),
        db
          .select({ value: count() })
          .from(schoolMemberships)
          .where(
            and(
              eq(schoolMemberships.schoolId, school.id),
              eq(schoolMemberships.role, "student"),
            ),
          ),
      ]);
      const currentLicence = licences[0];

      return {
        ...school,
        status: getSchoolLicenceStatus(licences, school.isActive, today),
        seatsUsed: seatResult.value,
        studentCap: currentLicence?.studentCap ?? null,
        endsAt: currentLicence?.endsAt ?? null,
      };
    }),
  );

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-extrabold text-neutral-700">Schools</h1>
        <Link href="/platform/invites">
          <Button variant="default">Teacher invites</Button>
        </Link>
      </header>
      <CreateSchoolForm />
      <section className="mt-8">
        {schoolRows.length ? (
          <div className="overflow-x-auto rounded-2xl border-2 border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b-2 border-slate-100 text-slate-500">
                <tr>
                  <th className="px-4 py-3">School</th>
                  <th className="px-4 py-3">Active</th>
                  <th className="px-4 py-3">Seats</th>
                  <th className="px-4 py-3">Licence</th>
                  <th className="px-4 py-3">Ends</th>
                </tr>
              </thead>
              <tbody>
                {schoolRows.map((school) => (
                  <tr key={school.id} className="border-b border-slate-100">
                    <td className="px-4 py-3 font-bold">
                      <Link
                        href={`/platform/schools/${school.id}`}
                        className="text-sky-700 hover:underline"
                      >
                        {school.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {school.isActive ? "Active" : "Inactive"}
                    </td>
                    <td className="px-4 py-3">
                      {school.seatsUsed} / {school.studentCap ?? "—"}
                    </td>
                    <td className="px-4 py-3 capitalize">{school.status}</td>
                    <td className="px-4 py-3">{school.endsAt ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-slate-500">No schools yet. Create the first one above.</p>
        )}
      </section>
    </main>
  );
};

export default PlatformSchoolsPage;
