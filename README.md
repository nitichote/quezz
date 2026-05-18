# Quezz Live

A small Kahoot-style seminar quiz app built with Next.js, Supabase, and Tailwind CSS.

## Local setup

1. Install dependencies.

```bash
npm install
```

2. Create a Supabase project.

3. Open Supabase SQL Editor and run `supabase/schema.sql`.

4. Create `.env.local`.

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
```

5. Start the app.

```bash
npm run dev
```

Open `http://localhost:3000`.

## Vercel deploy

Import this project into Vercel, add the same two environment variables in Project Settings, and deploy.

## Seminar flow

- Host opens `/host`, creates a quiz, and shares the room code or join link.
- Students open `/join`, enter their name and room code, and answer from their devices.
- Host uses Ask, Results, Next, and End quiz controls.

The current SQL policies are intentionally open for a demo/seminar MVP. Before using this for public production, tighten RLS and add host authentication.
