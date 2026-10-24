"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  createSchoolLicence,
  updateSchoolLicence,
} from "@/actions/platform-schools";
import { Button } from "@/components/ui/button";
import {
  licenceOverlaps,
  type LicenceInput,
} from "@/lib/schoolLicenceAdmin";

const tierPresets = [
  { label: "Small", cap: 100 },
  { label: "Medium", cap: 250 },
  { label: "Large", cap: 500 },
  { label: "XL", cap: 1000 },
] as const;

type Licence = LicenceInput & { id: number };

type Props = {
  schoolId: number;
  licences: Licence[];
  renewalDefaults: Pick<LicenceInput, "startsAt" | "endsAt">;
};

type FormProps = {
  schoolId: number;
  existing?: Licence;
  licences: Licence[];
  renewalDefaults: Pick<LicenceInput, "startsAt" | "endsAt">;
};

const today = () => new Date().toISOString().slice(0, 10);

const LicenceForm = ({
  schoolId,
  existing,
  licences,
  renewalDefaults,
}: FormProps) => {
  const router = useRouter();
  const [tierLabel, setTierLabel] = useState(existing?.tierLabel ?? "Small");
  const [studentCap, setStudentCap] = useState(
    String(existing?.studentCap ?? 100),
  );
  const [startsAt, setStartsAt] = useState(
    existing?.startsAt ?? today(),
  );
  const [endsAt, setEndsAt] = useState(existing?.endsAt ?? "");
  const [graceDays, setGraceDays] = useState(
    String(existing?.graceDays ?? 30),
  );
  const [invoiceReference, setInvoiceReference] = useState(
    existing?.invoiceReference ?? "",
  );
  const [paidAt, setPaidAt] = useState(existing?.paidAt ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isPreset = tierPresets.some((tier) => tier.label === tierLabel);
  const overlaps = licenceOverlaps(
    startsAt,
    endsAt,
    licences,
    existing?.id,
  );

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    startTransition(async () => {
      try {
        const cap = Number(studentCap);
        const grace = Number(graceDays);
        if (existing) {
          await updateSchoolLicence(
            schoolId,
            existing.id,
            tierLabel,
            cap,
            startsAt,
            endsAt,
            grace,
            invoiceReference,
            paidAt || null,
          );
        } else {
          await createSchoolLicence(
            schoolId,
            tierLabel,
            cap,
            startsAt,
            endsAt,
            grace,
            invoiceReference,
            paidAt || null,
          );
        }
        router.refresh();
        setMessage(existing ? "Licence updated." : "Licence added.");
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : "Could not save licence.",
        );
      }
    });
  };

  const applyRenewalDefaults = () => {
    setStartsAt(renewalDefaults.startsAt);
    setEndsAt(renewalDefaults.endsAt);
  };

  const changeTier = (value: string) => {
    setTierLabel(value);
    const preset = tierPresets.find((tier) => tier.label === value);
    if (preset) {
      setStudentCap(String(preset.cap));
    }
  };

  return (
    <form
      className="mt-4 grid gap-3 rounded-xl border border-slate-200 p-4 md:grid-cols-2"
      onSubmit={submit}
    >
      <div>
        <label className="mb-1 block text-sm font-semibold" htmlFor={`tier-${existing?.id ?? "new"}`}>
          Tier
        </label>
        <select
          id={`tier-${existing?.id ?? "new"}`}
          value={isPreset ? tierLabel : "Custom"}
          onChange={(event) => {
            if (event.target.value === "Custom") {
              setTierLabel("Custom");
            } else {
              changeTier(event.target.value);
            }
          }}
          className="h-10 w-full rounded-lg border-2 border-slate-200 px-3"
        >
          {tierPresets.map((tier) => (
            <option key={tier.label} value={tier.label}>
              {tier.label} ({tier.cap})
            </option>
          ))}
          <option value="Custom">Custom</option>
        </select>
        {!isPreset && (
          <input
            aria-label="Custom tier label"
            value={tierLabel}
            onChange={(event) => setTierLabel(event.target.value)}
            placeholder="Custom tier label"
            maxLength={100}
            className="mt-2 h-10 w-full rounded-lg border-2 border-slate-200 px-3"
          />
        )}
      </div>
      <label className="text-sm font-semibold">
        Student cap
        <input
          type="number"
          min={1}
          step={1}
          required
          value={studentCap}
          onChange={(event) => {
            setStudentCap(event.target.value);
            if (isPreset) {
              setTierLabel("Custom");
            }
          }}
          className="mt-1 h-10 w-full rounded-lg border-2 border-slate-200 px-3"
        />
      </label>
      <label className="text-sm font-semibold">
        Starts at
        <input
          type="date"
          required
          value={startsAt}
          onChange={(event) => setStartsAt(event.target.value)}
          className="mt-1 h-10 w-full rounded-lg border-2 border-slate-200 px-3"
        />
      </label>
      <label className="text-sm font-semibold">
        Ends at
        <input
          type="date"
          required
          value={endsAt}
          onChange={(event) => setEndsAt(event.target.value)}
          className="mt-1 h-10 w-full rounded-lg border-2 border-slate-200 px-3"
        />
      </label>
      <label className="text-sm font-semibold">
        Grace days
        <input
          type="number"
          min={0}
          step={1}
          required
          value={graceDays}
          onChange={(event) => setGraceDays(event.target.value)}
          className="mt-1 h-10 w-full rounded-lg border-2 border-slate-200 px-3"
        />
      </label>
      <label className="text-sm font-semibold">
        Invoice reference
        <input
          value={invoiceReference}
          onChange={(event) => setInvoiceReference(event.target.value)}
          className="mt-1 h-10 w-full rounded-lg border-2 border-slate-200 px-3"
        />
      </label>
      <label className="text-sm font-semibold">
        Paid date (optional)
        <input
          type="date"
          value={paidAt}
          onChange={(event) => setPaidAt(event.target.value)}
          className="mt-1 h-10 w-full rounded-lg border-2 border-slate-200 px-3"
        />
      </label>
      <div className="flex flex-wrap items-end gap-3">
        <Button type="submit" variant="primary" disabled={isPending}>
          {isPending ? "Saving..." : existing ? "Save changes" : "Add licence"}
        </Button>
        {!existing && (
          <Button
            type="button"
            variant="default"
            onClick={applyRenewalDefaults}
          >
            Renew
          </Button>
        )}
      </div>
      {overlaps && (
        <p className="md:col-span-2" role="status">
          Warning: these dates overlap an existing licence.
        </p>
      )}
      {message && (
        <p className="md:col-span-2 text-sm text-slate-600" role="status">
          {message}
        </p>
      )}
    </form>
  );
};

export const LicenceForms = ({
  schoolId,
  licences,
  renewalDefaults,
}: Props) => (
  <div className="space-y-4">
    <LicenceForm
      schoolId={schoolId}
      licences={licences}
      renewalDefaults={renewalDefaults}
    />
    {licences.map((licence) => (
      <details
        key={licence.id}
        className="rounded-xl border-2 border-slate-200 bg-white p-4"
      >
        <summary className="cursor-pointer font-bold text-neutral-700">
          Edit {licence.tierLabel} licence ({licence.startsAt} – {licence.endsAt})
        </summary>
        <LicenceForm
          schoolId={schoolId}
          existing={licence}
          licences={licences}
          renewalDefaults={renewalDefaults}
        />
      </details>
    ))}
  </div>
);
