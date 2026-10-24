"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { createSchool, setSchoolActive, updateSchoolName } from "@/actions/platform-schools";
import { Button } from "@/components/ui/button";

export const CreateSchoolForm = () => {
  const router = useRouter();
  const [name, setName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    startTransition(async () => {
      try {
        await createSchool(name);
        setName("");
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Could not create school.");
      }
    });
  };

  return (
    <section className="mt-6 rounded-2xl border-2 border-slate-200 border-b-4 bg-white p-6">
      <h2 className="text-xl font-bold text-neutral-700">Create school</h2>
      <form className="mt-4 flex flex-wrap gap-3" onSubmit={submit}>
        <label className="sr-only" htmlFor="new-school-name">School name</label>
        <input
          id="new-school-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={100}
          required
          className="h-11 min-w-0 flex-1 rounded-xl border-2 border-slate-200 px-3"
          placeholder="School name"
        />
        <Button type="submit" variant="primary" disabled={isPending}>
          {isPending ? "Creating..." : "Create school"}
        </Button>
      </form>
      {message && <p role="alert" className="mt-3 text-sm text-rose-600">{message}</p>}
    </section>
  );
};

export const SchoolNameForm = ({
  schoolId,
  initialName,
  isActive,
}: {
  schoolId: number;
  initialName: string;
  isActive: boolean;
}) => {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const updateName = () => {
    setMessage(null);
    startTransition(async () => {
      try {
        await updateSchoolName(schoolId, name);
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Could not update school.");
      }
    });
  };

  const toggleActive = () => {
    setMessage(null);
    startTransition(async () => {
      try {
        await setSchoolActive(schoolId, !isActive);
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Could not update school.");
      }
    });
  };

  return (
    <section className="mt-6 rounded-2xl border-2 border-slate-200 border-b-4 bg-white p-6">
      <h2 className="text-xl font-bold text-neutral-700">School details</h2>
      <div className="mt-4 flex flex-wrap gap-3">
        <label className="sr-only" htmlFor="school-name">School name</label>
        <input
          id="school-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={100}
          className="h-11 min-w-0 flex-1 rounded-xl border-2 border-slate-200 px-3"
        />
        <Button variant="primary" disabled={isPending} onClick={updateName}>
          Save name
        </Button>
        <Button
          variant={isActive ? "dangerOutline" : "secondary"}
          disabled={isPending}
          onClick={toggleActive}
        >
          {isActive ? "Deactivate" : "Reactivate"}
        </Button>
      </div>
      {message && <p role="alert" className="mt-3 text-sm text-rose-600">{message}</p>}
    </section>
  );
};
