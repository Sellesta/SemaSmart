# SemaSmart

School-licensed, gamified language-learning web app, launching December 2026.
December launch languages: Mandarin Chinese, Japanese, German. Korean is not in the launch scope.

## Business model (confirmed; drives design decisions)
- Sold per school: annual licence fee, tiered by student count. Schools are invoiced directly, outside the app. No per-student subscriptions and no payments in the app.
- Stripe is intentionally removed. Do not add payment code or dependencies.
- Many students are minors. Keep student data minimal, never visible across schools, and avoid public profiles.

## Stack
Next.js 14 (App Router), Clerk v5 for auth, Neon Postgres through drizzle-orm 0.45.x (neon-http driver) and drizzle-kit 0.31.x, react-admin at `/admin`, Tailwind with Radix/shadcn components, zustand for client state.

## Commands
- `npm run dev`, `npm run build`, `npm run lint`
- `npm run db:push` applies `db/schema.ts` to the database (no migrations folder yet)
- `npm run db:studio` opens Drizzle Studio
- `npm run db:seed`, `npm run db:prod`, `npm run db:reset` are DESTRUCTIVE (they delete rows). See safety rules.

## Layout
- `db/schema.ts` tables, `db/queries.ts` cached reads, `db/drizzle.ts` client
- `actions/` server actions for progress, hearts and points
- `app/(main)` learner app, `app/lesson` quiz flow, `app/(marketing)` landing page
- `app/admin` and `app/api/*` content CRUD, guarded by `isAdmin()` in `lib/adminAuth.ts`
- `scripts/` seed scripts (demo content only, not a real curriculum)

## Safety rules
- Ask before running any database command (`db:push`, `db:seed`, `db:prod`, `db:reset`). Only run them against a Neon dev branch, never the main database.
- The local `.env` points at the Neon dev branch; production changes happen only deliberately by me.
- `db:push` runs with `verbose` and `strict` enabled. Always read the generated SQL and abort on any `DROP CONSTRAINT` or any statement touching tables outside the school layer.
- Never read, print or commit `.env*` files, and never paste secrets into code, logs or chat.
- Content imports must never delete rows: deleting units, lessons or challenges cascades to student progress. Update by stable key instead.

## Proposed design (agreed in planning; confirm before building each piece)
- Schools, classes and licences live in our own Postgres tables. Clerk is only identity plus a role flag (admin, teacher, student).
- A licence record per school: tier label, student cap, start and end dates, invoice reference, paid date. Tiers are data, not code.
- A seat is a student enrolled in one of the school's classes; teachers don't count. Joins are blocked at the cap. After expiry plus a grace period, users see an "expired" page.
- The licence is the access gate: no class membership, or a lapsed licence, means a join or expired page instead of the app.
- Students join with a class code; teachers join with an invite code issued from an admin page showing seats used, cap and expiry.
- Content: beginner level (HSK 1, JLPT N5, CEFR A1), 4 units x 5 lessons x 8 challenges per language, imported from spreadsheets with stable keys, text-to-speech audio, and a `reviewed` flag that gates what reaches production. A native speaker checks Mandarin and Japanese before shipping. German goes first to prove the pipeline.

## Open decisions (ask me, don't assume)
- Whether hearts stay for school use, tier bands and student caps, grace period length, and who reviews Mandarin and Japanese content.

## Known issues, highest priority first (delete as fixed)
1. Answers are checked in the browser (`app/lesson/quiz.tsx`) and the server action only records completion, so points and hearts can be farmed. Move the check server-side.
2. `getTopTenUsers` in `db/queries.ts` is a global leaderboard showing first names and photos. Scope it to a class or school.
3. `lib/adminAuth.ts` hard-codes one admin Clerk ID; use Clerk role metadata. `next.config.mjs` sets CORS to `*` (header typo `Allow-Mwthods`); restrict it.
4. Before launch: staging (Neon branch plus preview deploy), generated migrations instead of `db:push` for production, error monitoring, privacy policy and consent.
5. Seed scripts insert explicit ids, so run `sql/reset-sequences.sql` afterwards. The content import script must never set ids itself.

## Working style
- TypeScript throughout; mutations are server actions followed by `revalidatePath`.
- Run `npm run lint` and `npm run build` before saying a change is done.
- Keep changes small and show the diff.
