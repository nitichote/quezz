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
          <p className="font-black">ยังไม่ได้เชื่อมต่อ Supabase</p>
          <p className="mt-1 text-sm leading-6 text-ink/70">
            สร้างไฟล์ <span className="font-mono">.env.local</span> จาก <span className="font-mono">.env.example</span>,
            ใส่ Supabase URL และ anon key แล้วรัน SQL ในหน้า{" "}
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
