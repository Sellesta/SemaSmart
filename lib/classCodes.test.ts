import { describe, expect, it } from "vitest";

import {
  classCodeAlphabet,
  generateClassCode,
  isValidClassCode,
  normalizeClassCode,
} from "./classCodes";

describe("class code helpers", () => {
  it("normalizes codes to uppercase and removes whitespace and hyphens", () => {
    expect(normalizeClassCode(" ab-c d\t12-ef ")).toBe("ABCD12EF");
  });

  it("generates eight characters only from the allowed alphabet", () => {
    const code = generateClassCode((max) => max - 1);

    expect(code).toBe(
      classCodeAlphabet[classCodeAlphabet.length - 1].repeat(8),
    );
    expect(isValidClassCode(code)).toBe(true);
  });

  it("rejects codes containing ambiguous characters", () => {
    expect(isValidClassCode("ABCD01EF")).toBe(false);
    expect(isValidClassCode("ABCDILOF")).toBe(false);
    expect(isValidClassCode("ABCD234")).toBe(false);
  });

  it("rejects an invalid random index", () => {
    expect(() => generateClassCode(() => classCodeAlphabet.length)).toThrow(
      RangeError,
    );
  });
});
