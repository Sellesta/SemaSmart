import { relations } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { boolean, check, date, foreignKey, index, integer, pgEnum, pgTable, primaryKey, serial, text, timestamp, unique, varchar } from "drizzle-orm/pg-core";

export const courses = pgTable("courses", {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    imageSrc: text("image_src").notNull(),
});

export const coursesRelation = relations(courses, ({ many }) => ({
    userProgress: many(userProgress),
    units: many(units),
}));

export const units = pgTable("units", {
    id: serial("id").primaryKey(),
    title: text("title").notNull(), // Unit 1
    description: text("description").notNull(), // Learn the basics of German
    courseId: integer("course_id").references(() => courses.id, { onDelete: "cascade" }).notNull(),
    order: integer("order").notNull(),
})

export const unitsRelations = relations(units, ({ many, one }) => ({
    course: one(courses, {
        fields: [units.courseId],
        references: [courses.id],
    }),
    lessons: many(lessons),
}));

export const lessons = pgTable("lessons", {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    unitId: integer("unit_id").references(() => units.id, { onDelete: "cascade" }).notNull(),
    order: integer("order").notNull(),
});

export const lessonsRelations = relations(lessons, ({ one, many }) => ({
    unit: one(units, {
        fields: [lessons.unitId],
        references: [units.id],
    }),
    challenges: many(challenges),
}));

export const challengesEnum = pgEnum("type", ["SELECT", "ASSIST"]);

export const challenges = pgTable("challenges", {
    id: serial("id").primaryKey(),
    lessonId: integer("lesson_id").references(() => lessons.id, { onDelete: "cascade" }).notNull(),
    type: challengesEnum("type").notNull(),
    question: text("question").notNull(),
    order: integer("order").notNull(),
});

export const challengesRelations = relations(challenges, ({ one, many }) => ({
    lesson: one(lessons, {
        fields: [challenges.lessonId],
        references: [lessons.id],
    }),
    challengeOptions: many(challengeOptions),
    challengeProgress: many(challengeProgress),
}))

export const challengeOptions = pgTable("challenge_options", {
    id: serial("id").primaryKey(),
    challengeId: integer("challenge_id").references(() => challenges.id, { onDelete: "cascade" }).notNull(),
    text: text("text").notNull(),
    correct: boolean("correct").notNull(),
    imageSrc: text("image_src"),
    audioSrc: text("audio_src"),
});

export const challengeOptionsRelations = relations(challengeOptions, ({ one }) => ({
    challenge: one(challenges, {
        fields: [challengeOptions.challengeId],
        references: [challenges.id],
    })
}));

export const challengeProgress = pgTable("challenge_progress", {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    challengeId: integer("challenge_id").references(() => challenges.id, { onDelete: "cascade" }).notNull(),
    completed: boolean("completed").notNull().default(false),
});

export const challengeProgressRelations = relations(challengeProgress, ({ one }) => ({
    challenge: one(challenges, {
        fields: [challengeProgress.challengeId],
        references: [challenges.id],
    })
}));


export const userProgress = pgTable("user_progress", {
    userId: text("user_id").primaryKey(),
    username: text("user_name").notNull().default("User"),
    userImageSrc: text("user_image_src").notNull().default("/mascot.svg"),
    activeCourseId: integer("active_course_id").references(() => courses.id, { onDelete: "cascade" }),
    hearts: integer("hearts").notNull().default(5),
    point: integer("points").notNull().default(0),
});

export const userProgressRelations = relations(userProgress, ({ one }) => ({
    activeCourse: one(courses, {
        fields: [userProgress.activeCourseId],
        references: [courses.id],
    }),
}));

export const schoolMemberRoleEnum = pgEnum("school_member_role", ["student", "teacher"]);

export const schools = pgTable("schools", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const schoolsRelations = relations(schools, ({ many }) => ({
    licenses: many(schoolLicenses),
    memberships: many(schoolMemberships),
    classes: many(classes),
    teacherInvites: many(teacherInvites),
}));

export const schoolLicenses = pgTable("school_licenses", {
    id: serial("id").primaryKey(),
    schoolId: integer("school_id").references(() => schools.id, { onDelete: "restrict" }).notNull(),
    tierLabel: text("tier_label").notNull(),
    studentCap: integer("student_cap").notNull(),
    startsAt: date("starts_at", { mode: "string" }).notNull(),
    endsAt: date("ends_at", { mode: "string" }).notNull(),
    graceDays: integer("grace_days").notNull().default(30),
    invoiceReference: text("invoice_reference"),
    paidAt: date("paid_at", { mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
    schoolEndDateLookupIdx: index("school_licenses_school_end_date_idx").on(table.schoolId, table.endsAt),
    positiveStudentCap: check("school_licenses_student_cap_positive", sql`${table.studentCap} > 0`),
    nonnegativeGraceDays: check("school_licenses_grace_days_nonnegative", sql`${table.graceDays} >= 0`),
    validDateRange: check("school_licenses_valid_date_range", sql`${table.startsAt} <= ${table.endsAt}`),
}));

export const schoolLicensesRelations = relations(schoolLicenses, ({ one }) => ({
    school: one(schools, {
        fields: [schoolLicenses.schoolId],
        references: [schools.id],
    }),
}));

export const schoolMemberships = pgTable("school_memberships", {
    schoolId: integer("school_id").references(() => schools.id, { onDelete: "restrict" }).notNull(),
    userId: text("user_id").notNull(),
    role: schoolMemberRoleEnum("role").notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
    // Column order is intentionally reversed: drizzle-kit reads composite constraint columns in an unspecified order, and this order keeps db:push free of false DROP/ADD diffs. Don't reorder.
    schoolUserPrimaryKey: primaryKey({
        name: "school_memberships_pk",
        columns: [table.userId, table.schoolId],
    }),
    oneSchoolPerUser: unique("school_memberships_user_unique").on(table.userId),
    schoolRoleIdx: index("school_memberships_school_role_idx").on(table.schoolId, table.role),
}));

export const schoolMembershipsRelations = relations(schoolMemberships, ({ one, many }) => ({
    school: one(schools, {
        fields: [schoolMemberships.schoolId],
        references: [schools.id],
    }),
    classMemberships: many(classMemberships),
}));

export const classes = pgTable("classes", {
    id: serial("id").primaryKey(),
    schoolId: integer("school_id").references(() => schools.id, { onDelete: "restrict" }).notNull(),
    createdByUserId: text("created_by_user_id").notNull(),
    name: text("name").notNull(),
    joinCode: varchar("join_code", { length: 8 }).notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
    // Column order is intentionally reversed: drizzle-kit reads composite constraint columns in an unspecified order, and this order keeps db:push free of false DROP/ADD diffs. Don't reorder.
    schoolClassUnique: unique("classes_id_school_id_unique").on(table.schoolId, table.id),
    joinCodeUnique: unique("classes_join_code_unique").on(table.joinCode),
    classOwnerMembership: foreignKey({
        name: "classes_owner_membership_fk",
        columns: [table.schoolId, table.createdByUserId],
        foreignColumns: [schoolMemberships.schoolId, schoolMemberships.userId],
    }).onDelete("restrict"),
    joinCodeLength: check("classes_join_code_length", sql`char_length(${table.joinCode}) = 8`),
}));

export const classesRelations = relations(classes, ({ one, many }) => ({
    school: one(schools, {
        fields: [classes.schoolId],
        references: [schools.id],
    }),
    owner: one(schoolMemberships, {
        fields: [classes.schoolId, classes.createdByUserId],
        references: [schoolMemberships.schoolId, schoolMemberships.userId],
    }),
    memberships: many(classMemberships),
}));

export const classMemberships = pgTable("class_memberships", {
    classId: integer("class_id").notNull(),
    schoolId: integer("school_id").notNull(),
    userId: text("user_id").notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
    // Column order is intentionally reversed: drizzle-kit reads composite constraint columns in an unspecified order, and this order keeps db:push free of false DROP/ADD diffs. Don't reorder.
    classStudentUnique: unique("class_memberships_class_user_unique").on(table.userId, table.classId),
    userIdx: index("class_memberships_user_id_idx").on(table.userId),
    classForeignKey: foreignKey({
        name: "class_memberships_class_fk",
        columns: [table.classId],
        foreignColumns: [classes.id],
    }).onDelete("restrict"),
    classSchoolForeignKey: foreignKey({
        name: "class_memberships_class_school_fk",
        columns: [table.classId, table.schoolId],
        foreignColumns: [classes.id, classes.schoolId],
    }).onDelete("restrict"),
    schoolMemberForeignKey: foreignKey({
        name: "class_memberships_school_member_fk",
        columns: [table.schoolId, table.userId],
        foreignColumns: [schoolMemberships.schoolId, schoolMemberships.userId],
    }).onDelete("restrict"),
}));

export const classMembershipsRelations = relations(classMemberships, ({ one }) => ({
    class: one(classes, {
        fields: [classMemberships.classId, classMemberships.schoolId],
        references: [classes.id, classes.schoolId],
    }),
    member: one(schoolMemberships, {
        fields: [classMemberships.schoolId, classMemberships.userId],
        references: [schoolMemberships.schoolId, schoolMemberships.userId],
    }),
}));

export const teacherInvites = pgTable("teacher_invites", {
    id: serial("id").primaryKey(),
    schoolId: integer("school_id").references(() => schools.id, { onDelete: "restrict" }).notNull(),
    codeHash: text("code_hash").notNull(),
    createdByUserId: text("created_by_user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    redeemedAt: timestamp("redeemed_at", { withTimezone: true }),
    redeemedByUserId: text("redeemed_by_user_id"),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
}, (table) => ({
    codeHashUnique: unique("teacher_invites_code_hash_unique").on(table.codeHash),
    schoolExpiryIdx: index("teacher_invites_school_expiry_idx").on(table.schoolId, table.expiresAt),
    expiryAfterCreation: check("teacher_invites_expiry_after_creation", sql`${table.expiresAt} > ${table.createdAt}`),
    redemptionFieldsPaired: check(
        "teacher_invites_redemption_fields_paired",
        sql`(${table.redeemedAt} is null) = (${table.redeemedByUserId} is null)`,
    ),
}));

export const teacherInvitesRelations = relations(teacherInvites, ({ one }) => ({
    school: one(schools, {
        fields: [teacherInvites.schoolId],
        references: [schools.id],
    }),
}));
