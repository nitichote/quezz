"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, LogIn, UserPlus } from "lucide-react";
import { SetupWarning } from "@/components/SetupWarning";
import { getErrorMessage } from "@/lib/errors";
import { hasSupabaseConfig, requireSupabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function signIn() {
    setMessage("");
    if (!hasSupabaseConfig) return;
    setBusy(true);
    try {
      const supabase = requireSupabase();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      window.location.href = "/host";
    } catch (err) {
      setMessage(getErrorMessage(err, "เข้าสู่ระบบไม่สำเร็จ"));
    } finally {
      setBusy(false);
    }
  }

  async function signUp() {
    setMessage("");
    if (!hasSupabaseConfig) return;
    setBusy(true);
    try {
      const supabase = requireSupabase();
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      setMessage("สร้างบัญชีแล้ว ถ้า Supabase เปิด email confirmation กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ");
    } catch (err) {
      setMessage(getErrorMessage(err, "สร้างบัญชีไม่สำเร็จ"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="thai-bg soft-grid min-h-screen px-4 py-6 text-ink">
      <div className="mx-auto max-w-xl">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-ink/65 hover:text-ink">
          <ArrowLeft size={18} />
          หน้าแรก
        </Link>
        <div className="mt-6">
          <SetupWarning />
        </div>
        <section className="thai-panel mt-6 rounded-2xl p-6">
          <p className="text-sm font-black uppercase tracking-widest text-coral">Admin / Host Manager</p>
          <h1 className="mt-2 text-4xl font-black">เข้าสู่ระบบ</h1>
          <div className="mt-6 grid gap-4">
            <label className="font-black">
              Email
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 h-12 w-full rounded-xl border-2 border-[#7c3aed]/15 bg-white px-3 outline-none focus:border-[#7c3aed]"
                type="email"
              />
            </label>
            <label className="font-black">
              Password
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 h-12 w-full rounded-xl border-2 border-[#7c3aed]/15 bg-white px-3 outline-none focus:border-[#7c3aed]"
                type="password"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                onClick={signIn}
                disabled={busy}
                className="thai-button inline-flex h-12 items-center justify-center gap-2 bg-[#4c1d95] font-black text-white"
              >
                <LogIn size={18} />
                เข้าสู่ระบบ
              </button>
              <button
                onClick={signUp}
                disabled={busy}
                className="thai-button inline-flex h-12 items-center justify-center gap-2 border-2 border-[#4c1d95] bg-white font-black text-[#4c1d95]"
              >
                <UserPlus size={18} />
                สมัคร host
              </button>
            </div>
            {message ? <p className="rounded-xl bg-[#ede9fe] p-3 font-bold text-[#6d28d9]">{message}</p> : null}
          </div>
        </section>
      </div>
    </main>
  );
}
