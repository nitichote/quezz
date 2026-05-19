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
GEMINI_API_KEY=your-gemini-api-key
```

5. Start the app.

```bash
npm run dev
```

Open `http://localhost:3000`.

## Vercel deploy

Import this project into Vercel, add the same environment variables in Project Settings, and deploy.

`GEMINI_API_KEY` is used only by the server API route for Gemini TTS winner announcements. Do not prefix it with `NEXT_PUBLIC_`.

## Seminar flow

- Admin opens `/admin` and assigns host manager roles.
- Host manager opens `/login`, signs in, then opens `/host`.
- When a host creates a room, the app checks whether another room is already active. If yes, it blocks creating a new room until the active one ends.
- Host creates a quiz and shares the room code or join link.
- Students open `/join`, enter their name and room code, and answer from their devices.
- Host uses Ask, Results, Next, and End quiz controls.
- Host can set seconds per question, auto-advance to results, auto-start the next question, and toggle simple quiz music.

## First admin setup

After running `supabase/schema.sql`, create your first user from `/login`. Then in Supabase SQL Editor, promote that user to admin:

```sql
update public.user_profiles
set role = 'admin'
where email = 'your-email@example.com';
```

Only admins can update roles.

The student join flow remains public for seminar convenience.
