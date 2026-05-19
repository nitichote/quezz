"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Shield, SlidersHorizontal } from "lucide-react";
import { SetupWarning } from "@/components/SetupWarning";
import { getErrorMessage } from "@/lib/errors";
import { hasSupabaseConfig, requireSupabase } from "@/lib/supabase";
import { AppSettings, UserProfile, UserRole } from "@/lib/types";

export default function AdminPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
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

      const { data: settingsRow, error: settingsError } = await supabase.from("app_settings").select("*").eq("id", true).maybeSingle();
      if (settingsError) throw settingsError;
      setSettings((settingsRow ?? { id: true, prevent_parallel_rooms: true }) as AppSettings);
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

  async function updatePreventParallelRooms(enabled: boolean) {
    const supabase = requireSupabase();
    setBusy(true);
    setMessage("");
    const { data, error } = await supabase
      .from("app_settings")
      .upsert({ id: true, prevent_parallel_rooms: enabled, updated_at: new Date().toISOString() })
      .select()
      .single();
    setBusy(false);

    if (error) {
      setMessage(getErrorMessage(error, "บันทึกการตั้งค่าไม่สำเร็จ"));
      return;
    }

    setSettings(data as AppSettings);
    setMessage(enabled ? "เปิดการตรวจสอบห้องซ้ำแล้ว" : "ปิดการตรวจสอบห้องซ้ำแล้ว สามารถเปิดหลายห้องพร้อมกันได้");
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
          <div className="mt-5 grid gap-5">
            <section className="thai-panel rounded-2xl p-5">
              <div className="flex items-center gap-2 font-black text-[#4c1d95]">
                <SlidersHorizontal size={20} />
                ตั้งค่าการสร้างห้อง
              </div>
              <label className="mt-4 flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-[#7c3aed]/10 bg-white p-4">
                <span>
                  <span className="block font-black">ตรวจสอบห้องซ้ำก่อนสร้างห้องใหม่</span>
                  <span className="mt-1 block text-sm font-bold text-ink/60">
                    ถ้าเปิดไว้ ระบบจะกันไม่ให้สร้างห้องใหม่เมื่อมีห้อง lobby/question/results ค้างอยู่ ถ้าปิดไว้ host manager จะเปิดหลายห้องพร้อมกันได้
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={settings?.prevent_parallel_rooms ?? true}
                  disabled={busy}
                  onChange={(event) => updatePreventParallelRooms(event.target.checked)}
                  className="mt-1 h-6 w-6 accent-[#4c1d95]"
                />
              </label>
            </section>

            <section className="thai-panel rounded-2xl p-5">
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
          </div>
        ) : null}
      </div>
    </main>
  );
}
