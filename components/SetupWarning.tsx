"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { hasSupabaseConfig } from "@/lib/supabase";

export function SetupWarning() {
  if (hasSupabaseConfig) {
    return null;
  }

  return (
    <div className="mb-5 rounded-md border-2 border-gold bg-white p-4 text-ink shadow-panel">
      <div className="flex gap-3">
        <AlertTriangle className="mt-1 shrink-0 text-gold" />
        <div>
          <p className="font-black">Supabase is not connected yet.</p>
          <p className="mt-1 text-sm leading-6 text-ink/70">
            Create <span className="font-mono">.env.local</span> from <span className="font-mono">.env.example</span>,
            add your Supabase URL and anon key, then run the SQL in{" "}
            <Link className="font-bold underline" href="/setup">
              setup
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
