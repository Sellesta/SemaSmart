import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { JoinForm } from "./join-form";

const JoinPage = async () => {
  const { userId } = await auth();
  if (!userId) {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <section className="w-full max-w-md rounded-2xl border-2 border-slate-200 border-b-4 bg-white p-8">
        <h1 className="text-center text-2xl font-extrabold text-neutral-700">
          Join your class
        </h1>
        <p className="mt-3 text-center text-sm text-slate-500">
          Enter the class code from your teacher to join your school.
        </p>
        <JoinForm />
      </section>
    </main>
  );
};

export default JoinPage;
