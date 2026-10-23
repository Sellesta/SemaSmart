import type { schoolLicenses } from "@/db/schema";

type Licence = Pick<
  typeof schoolLicenses.$inferSelect,
  "startsAt" | "endsAt" | "graceDays"
>;

export type LicenceStatus = "active" | "grace" | "expired";
export type LicenceRecord = Pick<
  typeof schoolLicenses.$inferSelect,
  "startsAt" | "endsAt" | "graceDays"
>;

const millisecondsPerDay = 24 * 60 * 60 * 1000;

const dateToDayNumber = (date: string) =>
  Date.parse(`${date}T00:00:00.000Z`) / millisecondsPerDay;

export const getLicenceStatus = (
  licence: LicenceRecord,
  today: Date,
): LicenceStatus => {
  if (Number.isNaN(today.getTime())) {
    throw new RangeError("Invalid date");
  }

  const todayDay = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  ) / millisecondsPerDay;
  const startsAtDay = dateToDayNumber(licence.startsAt);
  const endsAtDay = dateToDayNumber(licence.endsAt);

  if (todayDay < startsAtDay) {
    return "expired";
  }

  if (todayDay <= endsAtDay) {
    return "active";
  }

  if (todayDay <= endsAtDay + licence.graceDays) {
    return "grace";
  }

  return "expired";
};

const licenceStatusRank: Record<LicenceStatus, number> = {
  active: 2,
  grace: 1,
  expired: 0,
};

export const getBestLicenceStatus = (
  licences: LicenceRecord[],
  today: Date,
): LicenceStatus =>
  licences.reduce<LicenceStatus>(
    (bestStatus, licence) => {
      const status = getLicenceStatus(licence, today);
      return licenceStatusRank[status] > licenceStatusRank[bestStatus]
        ? status
        : bestStatus;
    },
    "expired",
  );
