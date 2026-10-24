import { describe, expect, it } from "vitest";
import {
  groupContentRows,
  selectImportContent,
  type ContentCsvRow,
} from "./contentImport";

const row = (overrides: Partial<ContentCsvRow> = {}): ContentCsvRow => ({
  rowNumber: 2,
  course_title: "German",
  unit_order: "1",
  unit_title: "Unit 1",
  unit_description: "Basics",
  lesson_order: "1",
  lesson_title: "Greetings",
  challenge_key: "greetings-1",
  challenge_order: "1",
  type: "SELECT",
  question: "Choose hello",
  status: "reviewed",
  option_text: "Hallo",
  correct: "true",
  image_file: "",
  audio_file: "",
  audio_text: "",
  ...overrides,
});

describe("groupContentRows", () => {
  it("groups option rows into position-sorted challenges", () => {
    const grouped = groupContentRows([
      row(),
      row({
        rowNumber: 3,
        option_text: "Tschüss",
        correct: "true",
        challenge_order: "2",
        challenge_key: "greetings-2",
      }),
      row({
        rowNumber: 4,
        option_text: "Auf Wiedersehen",
        correct: "false",
        challenge_order: "2",
        challenge_key: "greetings-2",
      }),
      row({ rowNumber: 5, option_text: "Guten Tag", correct: "false" }),
    ]);

    expect(grouped.courseTitle).toBe("German");
    expect(grouped.units[0].lessons[0].challenges.map(({ order }) => order)).toEqual([
      1, 2,
    ]);
    expect(grouped.units[0].lessons[0].challenges[1].options).toHaveLength(2);
  });

  it("rejects invalid challenge types, non-integer orders and incorrect option counts", () => {
    expect(() =>
      groupContentRows([
        row({ type: "MATCH" }),
      ]),
    ).toThrow(/type must be SELECT, ASSIST or LISTEN/i);

    expect(() => groupContentRows([row()])).toThrow(/must have 2 to 4 options/i);
    expect(() =>
      groupContentRows([
        row(),
        row({ rowNumber: 3, option_text: "Guten Tag", correct: "false" }),
        row({ rowNumber: 4, option_text: "Bitte", correct: "false" }),
        row({ rowNumber: 5, option_text: "Danke", correct: "false" }),
        row({ rowNumber: 6, option_text: "Bitte schön", correct: "false" }),
      ]),
    ).toThrow(/must have 2 to 4 options/i);
    expect(() =>
      groupContentRows([
        row({ unit_order: "1.5" }),
        row({ rowNumber: 3, option_text: "Guten Tag", correct: "false" }),
      ]),
    ).toThrow(/unit_order must be an integer/i);
  });

  it("requires one correct answer and unique option text", () => {
    expect(() =>
      groupContentRows([
        row(),
        row({ rowNumber: 3, option_text: "hallo", correct: "false" }),
      ]),
    ).toThrow(/duplicate option texts/i);

    expect(() =>
      groupContentRows([
        row({ correct: "false" }),
        row({ rowNumber: 3, option_text: "Guten Tag", correct: "false" }),
      ]),
    ).toThrow(/exactly one correct option/i);
  });

  it("rejects a key reused at a different challenge position", () => {
    expect(() =>
      groupContentRows([
        row(),
        row({
          rowNumber: 3,
          lesson_order: "2",
          option_text: "Tschüss",
          correct: "false",
        }),
      ]),
    ).toThrow(/used by more than one challenge/i);
  });

  it("requires audio_text on the correct LISTEN option", () => {
    expect(() =>
      groupContentRows([
        row({ type: "LISTEN" }),
        row({ rowNumber: 3, type: "LISTEN", option_text: "Guten Tag", correct: "false" }),
      ]),
    ).toThrow(/needs audio_text on its correct option/i);

    const listenChallenge = groupContentRows([
      row({ type: "LISTEN", audio_text: "Hallo" }),
      row({
        rowNumber: 3,
        type: "LISTEN",
        option_text: "Guten Tag",
        correct: "false",
      }),
    ]).units[0].lessons[0].challenges[0];
    expect(listenChallenge.options[0].audioText).toBe("Hallo");
  });

  it("imports reviewed rows by default and includes drafts when requested", () => {
    const grouped = groupContentRows([
      row(),
      row({ rowNumber: 3, option_text: "Guten Tag", correct: "false" }),
      row({
        rowNumber: 4,
        challenge_key: "draft-challenge",
        challenge_order: "2",
        status: "draft",
      }),
      row({
        rowNumber: 5,
        challenge_key: "draft-challenge",
        challenge_order: "2",
        status: "draft",
        option_text: "Guten Tag",
        correct: "false",
      }),
    ]);

    expect(selectImportContent(grouped, false).units[0].lessons[0].challenges).toHaveLength(1);
    expect(selectImportContent(grouped, true).units[0].lessons[0].challenges).toHaveLength(2);
  });
});
