import { Button } from "@/components/ui/button";
import { SignOutButton } from "@clerk/nextjs";

const ExpiredPage = () => (
  <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
    <section className="w-full max-w-lg rounded-2xl border-2 border-slate-200 border-b-4 bg-white p-8 text-center">
      <h1 className="text-2xl font-extrabold text-neutral-700">
        School licence ended
      </h1>
      <p className="mt-4 text-slate-600">
        Your school&apos;s SemaSmart licence has ended. Please contact your
        school&apos;s teacher or SemaSmart for help restoring access.
      </p>
      <SignOutButton signOutOptions={{ redirectUrl: "/" }}>
        <Button variant="primary" size="lg" className="mt-6">
          Sign out
        </Button>
      </SignOutButton>
    </section>
  </main>
);

export default ExpiredPage;
