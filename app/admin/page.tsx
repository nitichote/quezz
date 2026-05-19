"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Shield } from "lucide-react";
import { SetupWarning } from "@/components/SetupWarning";
import { getErrorMessage } from "@/lib/errors";
import { hasSupabaseConfig, requireSupabase } from "@/lib/supabase";
import { UserProfile, UserRole } from "@/lib/types";

export default function AdminPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void loadAdminData();
  }, []);

  async function loadAdminData() {
    if (!hasSupabaseConfig) return;
    setBusy(true);
    setMessage("");
    try {
      const supabase = requireSupabase();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        window.location.href = "/login";
        return;
      }

      const { data: myProfile, error: profileError } = await supabase.from("user_profiles").select("*").eq("id", userData.user.id).single();
      if (profileError) throw profileError;
      setProfile(myProfile as UserProfile);

      if ((myProfile as UserProfile).role !== "admin") {
        setMessage("หน้านี้สำหรับ admin เท่านั้น");
        return;
      }

      const { data: profileRows, error: profilesError } = await supabase
        .from("user_profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;
      setProfiles((profileRows ?? []) as UserProfile[]);
    } catch (err) {
      setMessage(getErrorMessage(err, "โหลดข้อมูล admin ไม่สำเร็จ"));
    } finally {
      setBusy(false);
    }
  }

  async function updateRole(userId: string, role: UserRole) {
    const supabase = requireSupabase();
    const { error } = await supabase.from("user_profiles").update({ role }).eq("id", userId);
    if (error) {
      setMessage(getErrorMessage(error, "อัปเดต role ไม่สำเร็จ"));
      return;
    }
    await loadAdminData();
  }

  return (
    <main className="thai-bg soft-grid min-h-screen px-4 py-6 text-ink">
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-ink/65 hover:text-ink">
          <ArrowLeft size={18} />
          หน้าแรก
        </Link>
        <div className="mt-6">
          <SetupWarning />
        </div>
        <section className="thai-header mt-6 rounded-2xl p-6 text-white">
          <p className="text-sm font-black uppercase tracking-widest text-white/75">Admin Console</p>
          <h1 className="mt-2 text-4xl font-black">จัดการสิทธิ์ Host Manager</h1>
          <p className="mt-2 font-bold text-white/75">
            ระบบจะกันการเปิดห้องพร้อมกันโดยเช็ก active room ตอน host กดสร้างห้อง
          </p>
        </section>
        {message ? <p className="mt-4 rounded-xl bg-white p-3 font-bold text-[#6d28d9] shadow-panel">{message}</p> : null}

        {profile?.role === "admin" ? (
          <section className="thai-panel mt-5 rounded-2xl p-5">
            <div className="flex items-center gap-2 font-black text-[#4c1d95]">
              <Shield size={20} />
              ผู้ใช้งานและสิทธิ์
            </div>
            <div className="mt-4 grid gap-3">
              {profiles.map((item) => (
                <div key={item.id} className="rounded-xl border border-[#7c3aed]/10 bg-white p-3">
                  <p className="truncate font-black">{item.email}</p>
                  <div className="mt-2 flex gap-2">
                    <select
                      value={item.role}
                      disabled={busy}
                      onChange={(event) => updateRole(item.id, event.target.value as UserRole)}
                      className="h-10 rounded-xl border-2 border-[#7c3aed]/15 px-3 font-bold"
                    >
                      <option value="host_manager">host_manager</option>
                      <option value="admin">admin</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
