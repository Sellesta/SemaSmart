"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { redeemTeacherInvite } from "@/actions/school";
import { Button } from "@/components/ui/button";

export const TeacherInviteForm = () => {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await redeemTeacherInvite(code);
      if (result.status === "ok") {
        router.replace("/learn");
        router.refresh();
        return;
      }

      const messages = {
        invalid_code: "That invitation code is invalid, expired, or has been used.",
        other_school:
          "Your account is already linked to another school. Contact SemaSmart for help.",
        already_student:
          "This account is already a student. Contact SemaSmart if you need a teacher account.",
      } as const;
      setError(messages[result.status]);
    });
  };

  return (
    <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
      <label
        htmlFor="teacher-invite-code"
        className="block text-sm font-bold text-neutral-700"
      >
        Invitation code
      </label>
      <input
        id="teacher-invite-code"
        name="code"
        autoComplete="off"
        autoCapitalize="characters"
        maxLength={16}
        value={code}
        onChange={(event) => setCode(event.target.value)}
        className="h-12 w-full rounded-xl border-2 border-slate-200 px-4 text-center text-lg font-bold uppercase tracking-widest text-neutral-700 outline-none focus:border-sky-500"
        placeholder="12-character code"
        required
      />
      {error && (
        <p role="alert" className="text-sm font-semibold text-rose-600">
          {error}
        </p>
      )}
      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full"
        disabled={isPending}
      >
        {isPending ? "Joining..." : "Join as teacher"}
      </Button>
    </form>
  );
};
