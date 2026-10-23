import { randomInt } from "node:crypto";

export const classCodeAlphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export const normalizeClassCode = (code: string): string =>
  code.replace(/[\s-]/g, "").toUpperCase();

export const isValidClassCode = (code: string): boolean =>
  code.length === 8 &&
  code.split("").every((character) => classCodeAlphabet.includes(character));

export const generateClassCode = (
  nextIndex: (max: number) => number = (max) => randomInt(max),
): string =>
  Array.from({ length: 8 }, () => {
    const index = nextIndex(classCodeAlphabet.length);
    if (
      !Number.isInteger(index) ||
      index < 0 ||
      index >= classCodeAlphabet.length
    ) {
      throw new RangeError("Class code index is outside the alphabet");
    }
    return classCodeAlphabet[index];
  }).join("");
