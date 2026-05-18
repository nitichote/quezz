import Link from "next/link";

export default function SetupPage() {
  return (
    <main className="min-h-screen bg-[#f7f5ef] px-5 py-8 text-ink">
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="font-bold text-ink/60 hover:text-ink">
          Back
        </Link>
        <h1 className="mt-8 text-4xl font-black">Supabase setup</h1>
        <p className="mt-3 leading-7 text-ink/70">
          In Supabase, create a project, open the SQL Editor, and run the SQL file at{" "}
          <span className="font-mono">supabase/schema.sql</span>. Then copy your Project URL and anon public key into{" "}
          <span className="font-mono">.env.local</span>.
        </p>
        <pre className="mt-6 overflow-x-auto rounded-md bg-ink p-5 text-sm leading-6 text-white">
{`NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key`}
        </pre>
        <p className="mt-5 leading-7 text-ink/70">
          For Vercel, add the same two variables in Project Settings, then redeploy.
        </p>
      </div>
    </main>
  );
}
