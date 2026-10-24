import { createHmac, randomInt } from "node:crypto";

import { classCodeAlphabet } from "./classCodes";

export const normalizeInviteCode = (code: string): string =>
  code.replace(/[\s-]/g, "").toUpperCase();

export const isValidInviteCode = (code: string): boolean =>
  code.length === 12 &&
  code.split("").every((character) => classCodeAlphabet.includes(character));

export const generateInviteCode = (): string =>
  Array.from(
    { length: 12 },
    () => classCodeAlphabet[randomInt(classCodeAlphabet.length)],
  ).join("");

export const hashInviteCode = (code: string, secret: string): string => {
  if (!secret) {
    throw new Error("INVITE_CODE_SECRET is required");
  }

  return createHmac("sha256", secret)
    .update(normalizeInviteCode(code), "utf8")
    .digest("hex");
};
