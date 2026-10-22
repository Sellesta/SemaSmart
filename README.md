# SemaSmart

SemaSmart is a school-licensed language-learning app for students, with lessons, interactive challenges, and progress tracking.

## Stack

- Next.js 14 (App Router), React, and TypeScript
- Clerk for authentication
- Neon Postgres with Drizzle ORM
- Tailwind CSS, Radix UI, and shadcn components
- Zustand for client state

## Run locally

Install dependencies, configure the required Clerk and Neon environment variables, then start the development server:

```bash
npm install
npm run dev
```

The app runs at `http://localhost:3000`. Run `npm run lint` to check the code.
