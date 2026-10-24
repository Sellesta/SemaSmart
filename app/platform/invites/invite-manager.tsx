"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  createTeacherInvite,
  revokeTeacherInvite,
} from "@/actions/platform-invites";
import { Button } from "@/components/ui/button";

type School = { id: number; name: string };
type Invite = {
  id: number;
  createdAt: string;
  expiresAt: string;
  status: "open" | "redeemed" | "expired" | "revoked";
};

type Props = {
  schools: School[];
  selectedSchoolId: number;
  invites: Invite[];
};

export const InviteManager = ({
  schools,
  selectedSchoolId,
  invites,
}: Props) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [code, setCode] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const createInvite = () => {
    setMessage(null);
    setCode(null);
    startTransition(async () => {
      try {
        const created = await createTeacherInvite(selectedSchoolId);
        setCode(created.code);
        router.refresh();
      } catch {
        setMessage("Could not create the invite. Please try again.");
      }
    });
  };

  const revokeInvite = (inviteId: number) => {
    setMessage(null);
    startTransition(async () => {
      try {
        await revokeTeacherInvite(inviteId, selectedSchoolId);
        router.refresh();
      } catch {
        setMessage("Could not revoke the invite. It may no longer be open.");
      }
    });
  };

  return (
    <div className="mt-6">
      <form action="/platform/invites" method="get" className="flex gap-3">
        <label htmlFor="schoolId" className="sr-only">
          School
        </label>
        <select
          id="schoolId"
          name="schoolId"
          defaultValue={selectedSchoolId}
          className="h-11 min-w-0 flex-1 rounded-xl border-2 border-slate-200 bg-white px-3 font-semibold text-neutral-700"
        >
          {schools.map((school) => (
            <option key={school.id} value={school.id}>
              {school.name}
            </option>
          ))}
        </select>
        <Button type="submit" variant="default">
          Select school
        </Button>
      </form>

      <section className="mt-8 rounded-2xl border-2 border-slate-200 border-b-4 bg-white p-6">
        <h2 className="text-xl font-bold text-neutral-700">Create invite</h2>
        <p className="mt-2 text-sm text-slate-500">
          The code can be used once and expires in 14 days. It will only be
          shown here immediately after creation.
        </p>
        <Button
          className="mt-4"
          variant="primary"
          disabled={isPending}
          onClick={createInvite}
        >
          {isPending ? "Creating..." : "Create teacher invite"}
        </Button>
        {code && (
          <div className="mt-4 rounded-xl bg-green-50 p-4">
            <p className="text-sm font-semibold text-green-900">
              Copy this code now. It will not be shown again.
            </p>
            <code className="mt-2 block select-all text-xl font-extrabold tracking-widest text-green-950">
              {code}
            </code>
          </div>
        )}
      </section>

      {message && (
        <p role="alert" className="mt-4 text-sm font-semibold text-rose-600">
          {message}
        </p>
      )}

      <section className="mt-8">
        <h2 className="text-xl font-bold text-neutral-700">Invites</h2>
        {invites.length ? (
          <div className="mt-4 overflow-x-auto rounded-2xl border-2 border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b-2 border-slate-100 text-slate-500">
                <tr>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Expires</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {invites.map((invite) => (
                  <tr key={invite.id} className="border-b border-slate-100">
                    <td className="px-4 py-3">
                      {new Date(invite.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      {new Date(invite.expiresAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 capitalize">{invite.status}</td>
                    <td className="px-4 py-3">
                      {invite.status === "open" && (
                        <Button
                          size="sm"
                          variant="dangerOutline"
                          disabled={isPending}
                          onClick={() => revokeInvite(invite.id)}
                        >
                          Revoke
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500">
            This school has no teacher invites yet.
          </p>
        )}
      </section>
    </div>
  );
};
