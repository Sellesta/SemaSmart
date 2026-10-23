"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { joinClassByCode } from "@/actions/school";
import { Button } from "@/components/ui/button";

const joinErrorMessages = {
  invalid_code: "That class code is invalid. Check it with your teacher and try again.",
  licence_expired:
    "Your school's licence is not currently active. Please contact your teacher.",
  seat_cap_reached:
    "Your school has reached its student limit. Please contact your teacher.",
  other_school:
    "Your account is already linked to another school. Contact SemaSmart for help.",
} as const;

export const JoinForm = () => {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await joinClassByCode(code);
      if (result.status === "ok") {
        router.replace("/learn");
        router.refresh();
        return;
      }

      setError(joinErrorMessages[result.status]);
    });
  };

  return (
    <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
      <label
        htmlFor="class-code"
        className="block text-sm font-bold text-neutral-700"
      >
        Class code
      </label>
      <input
        id="class-code"
        name="code"
        autoComplete="off"
        autoCapitalize="characters"
        maxLength={16}
        value={code}
        onChange={(event) => setCode(event.target.value)}
        className="h-12 w-full rounded-xl border-2 border-slate-200 px-4 text-center text-lg font-bold uppercase tracking-widest text-neutral-700 outline-none focus:border-sky-500"
        placeholder="8-character code"
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
        {isPending ? "Joining..." : "Join class"}
      </Button>
    </form>
  );
};
