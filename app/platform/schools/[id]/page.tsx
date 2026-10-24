import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";

import db from "@/db/drizzle";
import { schoolLicenses, schoolMemberships, schools } from "@/db/schema";
import { isAdmin } from "@/lib/adminAuth";
import { getRenewalDates } from "@/lib/schoolLicenceAdmin";
import { Button } from "@/components/ui/button";
import { LicenceForms } from "../licence-forms";
import { SchoolNameForm } from "../school-forms";

type Props = {
  params: { id: string };
};

const parseSchoolId = (id: string): number | null => {
  const parsed = Number(id);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const PlatformSchoolDetailPage = async ({ params }: Props) => {
  if (!(await isAdmin())) {
    redirect("/");
  }

  const schoolId = parseSchoolId(params.id);
  if (!schoolId) {
    notFound();
  }

  const [school] = await db
    .select({
      id: schools.id,
      name: schools.name,
      isActive: schools.isActive,
    })
    .from(schools)
    .where(eq(schools.id, schoolId))
    .limit(1);

  if (!school) {
    notFound();
  }

  const [licenceRows, teachers] = await Promise.all([
    db
      .select({
        id: schoolLicenses.id,
        tierLabel: schoolLicenses.tierLabel,
        studentCap: schoolLicenses.studentCap,
        startsAt: schoolLicenses.startsAt,
        endsAt: schoolLicenses.endsAt,
        graceDays: schoolLicenses.graceDays,
        invoiceReference: schoolLicenses.invoiceReference,
        paidAt: schoolLicenses.paidAt,
      })
      .from(schoolLicenses)
      .where(eq(schoolLicenses.schoolId, schoolId))
      .orderBy(desc(schoolLicenses.endsAt), desc(schoolLicenses.id)),
    db
      .select({ userId: schoolMemberships.userId })
      .from(schoolMemberships)
      .where(
        and(
          eq(schoolMemberships.schoolId, schoolId),
          eq(schoolMemberships.role, "teacher"),
        ),
      )
      .orderBy(schoolMemberships.userId),
  ]);
  const latestLicence = licenceRows[0];
  const renewalDates = getRenewalDates(
    latestLicence?.endsAt ?? null,
    new Date(),
  );
  const licences = licenceRows.map((licence) => ({
    ...licence,
    invoiceReference: licence.invoiceReference ?? null,
    paidAt: licence.paidAt ?? null,
  }));

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/platform/schools"
            className="text-sm font-semibold text-sky-700 hover:underline"
          >
            ← All schools
          </Link>
          <h1 className="mt-2 text-3xl font-extrabold text-neutral-700">
            {school.name}
          </h1>
        </div>
        <Link href={`/platform/invites?schoolId=${school.id}`}>
          <Button variant="default">Teacher invites</Button>
        </Link>
      </header>

      <SchoolNameForm
        schoolId={school.id}
        initialName={school.name}
        isActive={school.isActive}
      />

      <section className="mt-8">
        <h2 className="text-xl font-bold text-neutral-700">Licences</h2>
        {licenceRows.length ? (
          <div className="mt-4 overflow-x-auto rounded-2xl border-2 border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b-2 border-slate-100 text-slate-500">
                <tr>
                  <th className="px-4 py-3">Tier</th>
                  <th className="px-4 py-3">Cap</th>
                  <th className="px-4 py-3">Start</th>
                  <th className="px-4 py-3">End</th>
                  <th className="px-4 py-3">Grace</th>
                  <th className="px-4 py-3">Invoice</th>
                  <th className="px-4 py-3">Paid</th>
                </tr>
              </thead>
              <tbody>
                {licenceRows.map((licence) => (
                  <tr key={licence.id} className="border-b border-slate-100">
                    <td className="px-4 py-3">{licence.tierLabel}</td>
                    <td className="px-4 py-3">{licence.studentCap}</td>
                    <td className="px-4 py-3">{licence.startsAt}</td>
                    <td className="px-4 py-3">{licence.endsAt}</td>
                    <td className="px-4 py-3">{licence.graceDays}</td>
                    <td className="px-4 py-3">{licence.invoiceReference ?? "—"}</td>
                    <td className="px-4 py-3">{licence.paidAt ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500">No licences have been added.</p>
        )}
        <p className="mt-4 text-sm text-slate-500">
          Licences are retained for history. Existing records can be edited but
          never deleted.
        </p>
        <LicenceForms
          schoolId={school.id}
          licences={licences}
          renewalDefaults={renewalDates}
        />
      </section>

      <section className="mt-8 rounded-2xl border-2 border-slate-200 border-b-4 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-neutral-700">Teachers</h2>
          <Link
            href={`/platform/invites?schoolId=${school.id}`}
            className="font-semibold text-sky-700 hover:underline"
          >
            Create teacher invite
          </Link>
        </div>
        {teachers.length ? (
          <ul className="mt-4 space-y-2 text-sm text-slate-600">
            {teachers.map((teacher) => (
              <li key={teacher.userId}>{teacher.userId}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-slate-500">No teachers yet.</p>
        )}
      </section>
    </main>
  );
};

export default PlatformSchoolDetailPage;
