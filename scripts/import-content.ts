import "dotenv/config";
import { parse } from "csv-parse/sync";
import { eq, inArray } from "drizzle-orm";
import db from "../db/drizzle";
import {
  challengeOptions,
  challenges,
  courses,
  lessons,
  units,
} from "../db/schema";
import {
  ContentValidationError,
  groupContentRows,
  selectImportContent,
  type ContentChallenge,
  type ContentCsvRow,
} from "../lib/contentImport";
import { readFileSync } from "node:fs";
import path from "node:path";

const HEADERS = [
  "course_title",
  "course_image_file",
  "unit_order",
  "unit_title",
  "unit_description",
  "lesson_order",
  "lesson_title",
  "challenge_key",
  "challenge_order",
  "type",
  "question",
  "status",
  "option_text",
  "correct",
  "image_file",
  "audio_file",
  "audio_text",
] as const;

const REQUIRED_HEADERS = [
  "course_title",
  "unit_order",
  "unit_title",
  "unit_description",
  "lesson_order",
  "lesson_title",
  "challenge_key",
  "challenge_order",
  "type",
  "question",
  "status",
  "option_text",
  "correct",
] as const;

const parseContentCsv = (csv: string): ContentCsvRow[] => {
  let headerIssues: string[] = [];
  const records = parse(csv, {
    bom: true,
    skip_empty_lines: true,
    trim: true,
    columns: (headers: string[]) => {
      const normalized = headers.map((header) => header.trim());
      const missing = REQUIRED_HEADERS.filter(
        (header) => !normalized.includes(header),
      );
      if (missing.length) {
        headerIssues = [`CSV is missing required headers: ${missing.join(", ")}.`];
      }
      const duplicates = normalized.filter(
        (header, index) => normalized.indexOf(header) !== index,
      );
      if (duplicates.length) {
        headerIssues.push(`CSV contains duplicate headers: ${Array.from(new Set(duplicates)).join(", ")}.`);
      }
      return normalized.map((header) =>
        HEADERS.includes(header as (typeof HEADERS)[number]) ? header : false,
      );
    },
  }) as Record<string, string>[];

  if (headerIssues.length) throw new ContentValidationError(headerIssues);
  return records.map((record, index) => ({
    ...record,
    rowNumber: index + 2,
  }));
};

const getDatabaseHost = (): string => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set.");

  try {
    const url = new URL(connectionString);
    if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
      throw new Error("DATABASE_URL must use the postgres protocol.");
    }
    return url.hostname;
  } catch {
    throw new Error("DATABASE_URL is not a valid PostgreSQL connection URL.");
  }
};

const positionKey = (...positions: number[]) => positions.join(":");
const assetPath = (filename: string | null) => (filename ? `/${filename}` : null);

const parseArguments = () => {
  const args = process.argv.slice(2);
  const file = args.find((arg) => !arg.startsWith("--"));
  const includeDraft = args.includes("--include-draft");
  const apply = args.includes("--apply");
  const unknown = args.filter(
    (arg) =>
      arg.startsWith("--") &&
      arg !== "--include-draft" &&
      arg !== "--apply",
  );

  if (unknown.length) throw new Error(`Unknown argument(s): ${unknown.join(", ")}`);
  if (!file) {
    throw new Error(
      "Usage: npm run content:import -- <content.csv> [--apply] [--include-draft]",
    );
  }
  if (includeDraft && process.env.NODE_ENV !== "development") {
    throw new Error("--include-draft requires NODE_ENV=development.");
  }

  return { file, includeDraft, apply };
};

const readExistingContent = async (courseId: number) => {
  const existingUnits = await db
    .select()
    .from(units)
    .where(eq(units.courseId, courseId));
  const unitIds = existingUnits.map((unit) => unit.id);
  const existingLessons = unitIds.length
    ? await db.select().from(lessons).where(inArray(lessons.unitId, unitIds))
    : [];
  const lessonIds = existingLessons.map((lesson) => lesson.id);
  const existingChallenges = lessonIds.length
    ? await db.select().from(challenges).where(inArray(challenges.lessonId, lessonIds))
    : [];

  return { existingUnits, existingLessons, existingChallenges };
};

const checkUniquePositions = (
  existing: { order: number; id: number }[],
  parentById: Map<number, number>,
  label: string,
) => {
  const seen = new Set<string>();
  for (const item of existing) {
    const parent = parentById.get(item.id);
    if (parent === undefined) continue;
    const key = positionKey(parent, item.order);
    if (seen.has(key)) {
      throw new Error(`Database has duplicate ${label} position ${key}; aborting.`);
    }
    seen.add(key);
  }
};

const main = async () => {
  const { file, includeDraft, apply } = parseArguments();
  const absolutePath = path.resolve(process.cwd(), file);
  const csv = readFileSync(absolutePath, "utf8");
  const groupedContent = groupContentRows(parseContentCsv(csv));
  const importContent = selectImportContent(groupedContent, includeDraft);
  const host = getDatabaseHost();
  console.log(`Target database host: ${host}`);

  const matchingCourses = await db
    .select()
    .from(courses)
    .where(eq(courses.title, groupedContent.courseTitle));
  if (!matchingCourses.length) {
    throw new Error(
      `Course "${groupedContent.courseTitle}" does not exist. Create it before importing content.`,
    );
  }
  if (matchingCourses.length !== 1) {
    throw new Error(
      `Course title "${groupedContent.courseTitle}" is ambiguous; expected exactly one matching course.`,
    );
  }
  const course = matchingCourses[0];
  const {
    existingUnits,
    existingLessons,
    existingChallenges,
  } = await readExistingContent(course.id);

  const unitParentById = new Map(existingUnits.map((unit) => [unit.id, course.id]));
  checkUniquePositions(
    existingUnits.map(({ id, order }) => ({ id, order })),
    unitParentById,
    "unit",
  );
  const unitOrderById = new Map(existingUnits.map((unit) => [unit.id, unit.order]));
  const lessonParentById = new Map(
    existingLessons.map((lesson) => [lesson.id, lesson.unitId]),
  );
  const lessonOrderById = new Map(
    existingLessons.map((lesson) => [lesson.id, lesson.order]),
  );
  const challengeParentById = new Map(
    existingChallenges.map((challenge) => [challenge.id, challenge.lessonId]),
  );
  checkUniquePositions(
    existingLessons.map(({ id, order }) => ({ id, order })),
    lessonParentById,
    "lesson",
  );
  checkUniquePositions(
    existingChallenges.map(({ id, order }) => ({ id, order })),
    challengeParentById,
    "challenge",
  );

  const existingUnitByOrder = new Map(existingUnits.map((unit) => [unit.order, unit]));
  const existingLessonByPosition = new Map<string, (typeof existingLessons)[number]>();
  for (const lesson of existingLessons) {
    const unitOrder = unitOrderById.get(lesson.unitId);
    if (unitOrder !== undefined) {
      existingLessonByPosition.set(positionKey(unitOrder, lesson.order), lesson);
    }
  }
  const existingChallengeByPosition = new Map<
    string,
    (typeof existingChallenges)[number]
  >();
  for (const challenge of existingChallenges) {
    const lessonId = challengeParentById.get(challenge.id);
    const lessonOrder = lessonId === undefined ? undefined : lessonOrderById.get(lessonId);
    const unitId = lessonId === undefined ? undefined : lessonParentById.get(lessonId);
    const unitOrder = unitId === undefined ? undefined : unitOrderById.get(unitId);
    if (lessonOrder !== undefined && unitOrder !== undefined) {
      existingChallengeByPosition.set(
        positionKey(unitOrder, lessonOrder, challenge.order),
        challenge,
      );
    }
  }

  const csvChallengePositions = new Set<string>();
  for (const unit of groupedContent.units) {
    for (const lesson of unit.lessons) {
      for (const challenge of lesson.challenges) {
        csvChallengePositions.add(
          positionKey(unit.order, lesson.order, challenge.order),
        );
      }
    }
  }
  const unlistedChallenges = Array.from(existingChallengeByPosition.entries())
    .filter(([position]) => !csvChallengePositions.has(position))
    .map(([position, challenge]) => `${position} (id ${challenge.id})`);

  console.log(
    `Mode: ${apply ? "apply" : "dry run"}; importing ${
      includeDraft ? "reviewed and draft" : "reviewed"
    } rows.`,
  );
  for (const unit of importContent.units) {
    const existingUnit = existingUnitByOrder.get(unit.order);
    const unitAction = !existingUnit
      ? "Create"
      : existingUnit.title === unit.title &&
          existingUnit.description === unit.description
        ? "Keep"
        : "Update";
    console.log(
      `${unitAction} unit ${unit.order}: ${unit.title}`,
    );
    for (const lesson of unit.lessons) {
      const existingLesson = existingLessonByPosition.get(
        positionKey(unit.order, lesson.order),
      );
      const lessonAction = !existingLesson
        ? "Create"
        : existingLesson.title === lesson.title
          ? "Keep"
          : "Update";
      console.log(
        `  ${lessonAction} lesson ${lesson.order}: ${lesson.title}`,
      );
      for (const challenge of lesson.challenges) {
        const existingChallenge = existingChallengeByPosition.get(
          positionKey(unit.order, lesson.order, challenge.order),
        );
        console.log(
          `    ${existingChallenge ? "Update" : "Create"} ${challenge.type} challenge ${challenge.order}: ${challenge.question} (${challenge.options.length} options)`,
        );
      }
    }
  }
  if (!includeDraft) {
    console.log(
      `Draft challenges excluded: ${groupedContent.units.reduce(
        (total, unit) =>
          total +
          unit.lessons.reduce(
            (lessonTotal, lesson) =>
              lessonTotal +
              lesson.challenges.filter((challenge) => challenge.status === "draft")
                .length,
            0,
          ),
        0,
      )}`,
    );
  }
  if (unlistedChallenges.length) {
    console.log("Database challenges not present in the CSV:");
    for (const challenge of unlistedChallenges) console.log(`  ${challenge}`);
  } else {
    console.log("Database challenges not present in the CSV: none");
  }

  if (!apply) {
    console.log("Dry run complete. Re-run with --apply to write these changes.");
    return;
  }

  const unitIds = new Map<number, number>();
  const lessonIds = new Map<string, number>();
  const challengeIds = new Map<string, number>();
  for (const unit of importContent.units) {
    const existingUnit = existingUnitByOrder.get(unit.order);
    let unitId = existingUnit?.id;
    if (unitId === undefined) {
      const [inserted] = await db
        .insert(units)
        .values({
          courseId: course.id,
          order: unit.order,
          title: unit.title,
          description: unit.description,
        })
        .returning({ id: units.id });
      unitId = inserted.id;
    } else if (
      existingUnit &&
      (existingUnit.title !== unit.title ||
        existingUnit.description !== unit.description)
    ) {
      await db
        .update(units)
        .set({ title: unit.title, description: unit.description })
        .where(eq(units.id, unitId));
    }
    unitIds.set(unit.order, unitId);

    for (const lesson of unit.lessons) {
      const lessonPosition = positionKey(unit.order, lesson.order);
      const existingLesson = existingLessonByPosition.get(lessonPosition);
      let lessonId = existingLesson?.id;
      if (lessonId === undefined) {
        const [inserted] = await db
          .insert(lessons)
          .values({
            unitId,
            order: lesson.order,
            title: lesson.title,
          })
          .returning({ id: lessons.id });
        lessonId = inserted.id;
      } else if (existingLesson && existingLesson.title !== lesson.title) {
        await db
          .update(lessons)
          .set({ title: lesson.title })
          .where(eq(lessons.id, lessonId));
      }
      lessonIds.set(lessonPosition, lessonId);

      for (const challenge of lesson.challenges) {
        const challengePosition = positionKey(
          unit.order,
          lesson.order,
          challenge.order,
        );
        const existingChallenge =
          existingChallengeByPosition.get(challengePosition);
        let challengeId = existingChallenge?.id;
        const challengeValues = {
          lessonId,
          order: challenge.order,
          type: challenge.type,
          question: challenge.question,
        };
        if (challengeId === undefined) {
          const [inserted] = await db
            .insert(challenges)
            .values(challengeValues)
            .returning({ id: challenges.id });
          challengeId = inserted.id;
        } else if (
          existingChallenge &&
          (existingChallenge.type !== challenge.type ||
            existingChallenge.question !== challenge.question)
        ) {
          await db
            .update(challenges)
            .set({ type: challenge.type, question: challenge.question })
            .where(eq(challenges.id, challengeId));
        }
        challengeIds.set(challengePosition, challengeId);
        await replaceChallengeOptions(challengeId, challenge);
      }
    }
  }

  console.log(
    `Import complete: ${unitIds.size} units, ${lessonIds.size} lessons, ${challengeIds.size} challenges processed.`,
  );
};

const replaceChallengeOptions = async (
  challengeId: number,
  challenge: ContentChallenge,
) => {
  const deleteOptions = db
    .delete(challengeOptions)
    .where(eq(challengeOptions.challengeId, challengeId));
  const insertOptions = db.insert(challengeOptions).values(
    challenge.options.map((option) => ({
      challengeId,
      text: option.text,
      correct: option.correct,
      imageSrc: assetPath(option.imageFile),
      audioSrc: assetPath(option.audioFile),
    })),
  );

  await db.batch([deleteOptions, insertOptions]);
};

main().catch((error: unknown) => {
  if (error instanceof ContentValidationError) {
    console.error(`Content validation failed:\n${error.message}`);
  } else {
    console.error(error instanceof Error ? error.message : "Content import failed.");
  }
  process.exitCode = 1;
});
