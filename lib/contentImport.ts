export type ContentCsvRow = {
  rowNumber?: number;
  course_title?: string;
  course_image_file?: string;
  unit_order?: string;
  unit_title?: string;
  unit_description?: string;
  lesson_order?: string;
  lesson_title?: string;
  challenge_key?: string;
  challenge_order?: string;
  type?: string;
  question?: string;
  status?: string;
  option_text?: string;
  correct?: string;
  image_file?: string;
  audio_file?: string;
  audio_text?: string;
};

export type ContentOption = {
  text: string;
  correct: boolean;
  imageFile: string | null;
  audioFile: string | null;
  audioText: string | null;
};

export type ContentChallenge = {
  key: string;
  order: number;
  type: "SELECT" | "ASSIST" | "LISTEN";
  question: string;
  status: "reviewed" | "draft";
  options: ContentOption[];
};

export type ContentLesson = {
  order: number;
  title: string;
  challenges: ContentChallenge[];
};

export type ContentUnit = {
  order: number;
  title: string;
  description: string;
  lessons: ContentLesson[];
};

export type GroupedContent = {
  courseTitle: string;
  units: ContentUnit[];
};

type NormalizedRow = {
  rowNumber: number;
  courseTitle: string;
  unitOrder: number;
  unitTitle: string;
  unitDescription: string;
  lessonOrder: number;
  lessonTitle: string;
  challengeKey: string;
  challengeOrder: number;
  type: ContentChallenge["type"];
  question: string;
  status: ContentChallenge["status"];
  option: ContentOption;
};

export class ContentValidationError extends Error {
  constructor(readonly issues: string[]) {
    super(issues.join("\n"));
    this.name = "ContentValidationError";
  }
}

const requiredText = (
  row: ContentCsvRow,
  field:
    | "course_title"
    | "unit_title"
    | "unit_description"
    | "lesson_title"
    | "challenge_key"
    | "question"
    | "option_text",
  rowNumber: number,
  issues: string[],
): string => {
  const value = row[field]?.trim();
  if (!value) {
    issues.push(`Row ${rowNumber}: ${field} is required.`);
    return "";
  }
  return value;
};

const integerOrder = (
  value: string | undefined,
  field: string,
  rowNumber: number,
  issues: string[],
): number => {
  const trimmed = value?.trim() ?? "";
  if (!/^-?\d+$/.test(trimmed)) {
    issues.push(`Row ${rowNumber}: ${field} must be an integer.`);
    return 0;
  }

  const parsed = Number(trimmed);
  if (!Number.isSafeInteger(parsed)) {
    issues.push(`Row ${rowNumber}: ${field} must be a safe integer.`);
    return 0;
  }
  return parsed;
};

const optionalFile = (value: string | undefined): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const normalizeRows = (rows: ContentCsvRow[]): NormalizedRow[] => {
  const issues: string[] = [];
  const normalized: NormalizedRow[] = [];

  rows.forEach((row, index) => {
    const rowNumber = row.rowNumber ?? index + 2;
    const courseTitle = requiredText(row, "course_title", rowNumber, issues);
    const unitTitle = requiredText(row, "unit_title", rowNumber, issues);
    const unitDescription = requiredText(row, "unit_description", rowNumber, issues);
    const lessonTitle = requiredText(row, "lesson_title", rowNumber, issues);
    const challengeKey = requiredText(row, "challenge_key", rowNumber, issues);
    const question = requiredText(row, "question", rowNumber, issues);
    const optionText = requiredText(row, "option_text", rowNumber, issues);
    const unitOrder = integerOrder(row.unit_order, "unit_order", rowNumber, issues);
    const lessonOrder = integerOrder(row.lesson_order, "lesson_order", rowNumber, issues);
    const challengeOrder = integerOrder(
      row.challenge_order,
      "challenge_order",
      rowNumber,
      issues,
    );

    const typeValue = row.type?.trim().toUpperCase();
    if (typeValue !== "SELECT" && typeValue !== "ASSIST" && typeValue !== "LISTEN") {
      issues.push(`Row ${rowNumber}: type must be SELECT, ASSIST or LISTEN.`);
    }

    const statusValue = row.status?.trim().toLowerCase();
    if (statusValue !== "reviewed" && statusValue !== "draft") {
      issues.push(`Row ${rowNumber}: status must be reviewed or draft.`);
    }

    const correctValue = row.correct?.trim().toLowerCase();
    if (correctValue !== "true" && correctValue !== "false") {
      issues.push(`Row ${rowNumber}: correct must be true or false.`);
    }

    if (
      typeValue !== "SELECT" &&
      typeValue !== "ASSIST" &&
      typeValue !== "LISTEN"
    ) {
      return;
    }
    if (statusValue !== "reviewed" && statusValue !== "draft") return;
    if (correctValue !== "true" && correctValue !== "false") return;

    normalized.push({
      rowNumber,
      courseTitle,
      unitOrder,
      unitTitle,
      unitDescription,
      lessonOrder,
      lessonTitle,
      challengeKey,
      challengeOrder,
      type: typeValue,
      question,
      status: statusValue,
      option: {
        text: optionText,
        correct: correctValue === "true",
        imageFile: optionalFile(row.image_file),
        audioFile: optionalFile(row.audio_file),
        audioText: optionalFile(row.audio_text),
      },
    });
  });

  if (issues.length) throw new ContentValidationError(issues);
  return normalized;
};

const metadataIssue = (
  issues: string[],
  row: NormalizedRow,
  field: string,
) => {
  issues.push(`Row ${row.rowNumber}: ${field} differs within the same position/key.`);
};

export const groupContentRows = (rows: ContentCsvRow[]): GroupedContent => {
  if (!rows.length) throw new ContentValidationError(["CSV contains no content rows."]);

  const normalizedRows = normalizeRows(rows);
  const issues: string[] = [];
  const courseTitles = new Set(normalizedRows.map((row) => row.courseTitle));
  if (courseTitles.size !== 1) {
    issues.push("All rows in one CSV must have the same course_title.");
  }

  const unitMeta = new Map<number, { title: string; description: string }>();
  const lessonMeta = new Map<string, string>();
  const challengeByKey = new Map<string, {
    row: NormalizedRow;
    options: ContentOption[];
  }>();
  const challengePositionKeys = new Map<string, string>();

  for (const row of normalizedRows) {
    const unit = unitMeta.get(row.unitOrder);
    if (!unit) {
      unitMeta.set(row.unitOrder, {
        title: row.unitTitle,
        description: row.unitDescription,
      });
    } else {
      if (unit.title !== row.unitTitle) metadataIssue(issues, row, "unit_title");
      if (unit.description !== row.unitDescription) {
        metadataIssue(issues, row, "unit_description");
      }
    }

    const lessonPosition = `${row.unitOrder}:${row.lessonOrder}`;
    const lesson = lessonMeta.get(lessonPosition);
    if (!lesson) lessonMeta.set(lessonPosition, row.lessonTitle);
    else if (lesson !== row.lessonTitle) metadataIssue(issues, row, "lesson_title");

    const position = `${lessonPosition}:${row.challengeOrder}`;
    const existingKeyAtPosition = challengePositionKeys.get(position);
    if (existingKeyAtPosition && existingKeyAtPosition !== row.challengeKey) {
      issues.push(
        `Row ${row.rowNumber}: multiple challenge_key values use position ${position}.`,
      );
    } else {
      challengePositionKeys.set(position, row.challengeKey);
    }

    const challenge = challengeByKey.get(row.challengeKey);
    if (!challenge) {
      challengeByKey.set(row.challengeKey, { row, options: [row.option] });
      continue;
    }

    const first = challenge.row;
    if (
      first.unitOrder !== row.unitOrder ||
      first.lessonOrder !== row.lessonOrder ||
      first.challengeOrder !== row.challengeOrder
    ) {
      issues.push(
        `Row ${row.rowNumber}: challenge_key "${row.challengeKey}" is used by more than one challenge.`,
      );
    }
    if (first.type !== row.type) metadataIssue(issues, row, "type");
    if (first.question !== row.question) metadataIssue(issues, row, "question");
    if (first.status !== row.status) metadataIssue(issues, row, "status");
    if (first.lessonTitle !== row.lessonTitle) metadataIssue(issues, row, "lesson_title");
    challenge.options.push(row.option);
  }

  for (const [key, challenge] of Array.from(challengeByKey.entries())) {
    if (challenge.options.length < 2 || challenge.options.length > 4) {
      issues.push(
        `Challenge "${key}" must have 2 to 4 options; found ${challenge.options.length}.`,
      );
    }

    const optionTexts = new Set(
      challenge.options.map((option) => option.text.toLocaleLowerCase()),
    );
    if (optionTexts.size !== challenge.options.length) {
      issues.push(`Challenge "${key}" has duplicate option texts.`);
    }

    const correctOptions = challenge.options.filter((option) => option.correct);
    if (correctOptions.length !== 1) {
      issues.push(
        `Challenge "${key}" must have exactly one correct option; found ${correctOptions.length}.`,
      );
    }
    if (
      challenge.row.type === "LISTEN" &&
      correctOptions.length === 1 &&
      !correctOptions[0].audioText
    ) {
      issues.push(`LISTEN challenge "${key}" needs audio_text on its correct option.`);
    }
  }

  if (issues.length) throw new ContentValidationError(issues);

  const units = new Map<number, ContentUnit>();
  for (const row of normalizedRows) {
    let unit = units.get(row.unitOrder);
    if (!unit) {
      unit = {
        order: row.unitOrder,
        title: row.unitTitle,
        description: row.unitDescription,
        lessons: [],
      };
      units.set(row.unitOrder, unit);
    }

    let lesson = unit.lessons.find((item) => item.order === row.lessonOrder);
    if (!lesson) {
      lesson = { order: row.lessonOrder, title: row.lessonTitle, challenges: [] };
      unit.lessons.push(lesson);
    }

    let groupedChallenge = lesson.challenges.find(
      (item) => item.key === row.challengeKey,
    );
    if (!groupedChallenge) {
      groupedChallenge = {
        key: row.challengeKey,
        order: row.challengeOrder,
        type: row.type,
        question: row.question,
        status: row.status,
        options: [],
      };
      lesson.challenges.push(groupedChallenge);
    }
    groupedChallenge.options.push(row.option);
  }

  const sortByOrder = <T extends { order: number }>(items: T[]) =>
    items.sort((left, right) => left.order - right.order);
  for (const unit of Array.from(units.values())) {
    sortByOrder(unit.lessons);
    for (const lesson of unit.lessons) sortByOrder(lesson.challenges);
  }

  return {
    courseTitle: normalizedRows[0].courseTitle,
    units: sortByOrder(Array.from(units.values())),
  };
};

export const selectImportContent = (
  content: GroupedContent,
  includeDraft: boolean,
): GroupedContent => ({
  ...content,
  units: content.units
    .map((unit) => ({
      ...unit,
      lessons: unit.lessons
        .map((lesson) => ({
          ...lesson,
          challenges: lesson.challenges.filter(
            (challenge) => includeDraft || challenge.status === "reviewed",
          ),
        }))
        .filter((lesson) => lesson.challenges.length > 0),
    }))
    .filter((unit) => unit.lessons.length > 0),
});
