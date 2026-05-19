"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, CalendarPlus, Save, Shield, XCircle } from "lucide-react";
import { SetupWarning } from "@/components/SetupWarning";
import { getErrorMessage } from "@/lib/errors";
import { hasSupabaseConfig, requireSupabase } from "@/lib/supabase";
import { Reservation, UserProfile, UserRole } from "@/lib/types";

export default function AdminPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [selectedHost, setSelectedHost] = useState("");
  const [reservationTitle, setReservationTitle] = useState("Seminar Live Quiz");
  const [startsAt, setStartsAt] = useState("");
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

      const [{ data: profileRows, error: profilesError }, { data: reservationRows, error: reservationsError }] = await Promise.all([
        supabase.from("user_profiles").select("*").order("created_at", { ascending: false }),
        supabase
          .from("reservations")
          .select("*, user_profiles(*)")
          .order("starts_at", { ascending: false })
          .limit(50),
      ]);

      if (profilesError) throw profilesError;
      if (reservationsError) throw reservationsError;

      setProfiles((profileRows ?? []) as UserProfile[]);
      setReservations((reservationRows ?? []) as Reservation[]);
      setSelectedHost(((profileRows ?? []).find((item) => item.role === "host_manager") as UserProfile | undefined)?.id ?? "");
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

  async function createReservation() {
    if (!selectedHost || !startsAt) {
      setMessage("กรุณาเลือก host manager และเวลาเริ่ม");
      return;
    }

    const start = new Date(startsAt);
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    const supabase = requireSupabase();
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("reservations").insert({
      host_user_id: selectedHost,
      title: reservationTitle.trim() || "Seminar Live Quiz",
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
      created_by: userData.user?.id,
    });

    if (error) {
      setMessage(getErrorMessage(error, "จอง slot ไม่สำเร็จ อาจมี slot เวลาเดียวกันอยู่แล้ว"));
      return;
    }

    setMessage("จอง slot 1 ชั่วโมงเรียบร้อย");
    await loadAdminData();
  }

  async function cancelReservation(id: string) {
    const supabase = requireSupabase();
    const { error } = await supabase.from("reservations").update({ status: "cancelled" }).eq("id", id);
    if (error) {
      setMessage(getErrorMessage(error, "ยกเลิก reservation ไม่สำเร็จ"));
      return;
    }
    await loadAdminData();
  }

  return (
    <main className="thai-bg soft-grid min-h-screen px-4 py-6 text-ink">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-ink/65 hover:text-ink">
          <ArrowLeft size={18} />
          หน้าแรก
        </Link>
        <div className="mt-6">
          <SetupWarning />
        </div>
        <section className="thai-header mt-6 rounded-2xl p-6 text-white">
          <p className="text-sm font-black uppercase tracking-widest text-white/75">Admin Console</p>
          <h1 className="mt-2 text-4xl font-black">จัดการสิทธิ์และจองเวลา Seminar</h1>
          <p className="mt-2 font-bold text-white/75">Slot ละ 1 ชั่วโมง และระบบไม่ให้จองเวลาทับกัน</p>
        </section>
        {message ? <p className="mt-4 rounded-xl bg-white p-3 font-bold text-[#6d28d9] shadow-panel">{message}</p> : null}

        {profile?.role === "admin" ? (
          <div className="mt-5 grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
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

            <section className="thai-panel rounded-2xl p-5">
              <div className="flex items-center gap-2 font-black text-[#4c1d95]">
                <CalendarPlus size={20} />
                จอง slot 1 ชั่วโมง
              </div>
              <div className="mt-4 grid gap-3">
                <label className="font-black">
                  Host manager
                  <select
                    value={selectedHost}
                    onChange={(event) => setSelectedHost(event.target.value)}
                    className="mt-2 h-12 w-full rounded-xl border-2 border-[#7c3aed]/15 px-3 font-bold"
                  >
                    <option value="">เลือก host manager</option>
                    {profiles
                      .filter((item) => item.role === "host_manager" || item.role === "admin")
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.email}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="font-black">
                  ชื่องาน
                  <input
                    value={reservationTitle}
                    onChange={(event) => setReservationTitle(event.target.value)}
                    className="mt-2 h-12 w-full rounded-xl border-2 border-[#7c3aed]/15 px-3 font-bold"
                  />
                </label>
                <label className="font-black">
                  เวลาเริ่ม
                  <input
                    type="datetime-local"
                    value={startsAt}
                    onChange={(event) => setStartsAt(event.target.value)}
                    className="mt-2 h-12 w-full rounded-xl border-2 border-[#7c3aed]/15 px-3 font-bold"
                  />
                </label>
                <button
                  onClick={createReservation}
                  disabled={busy}
                  className="thai-button inline-flex h-12 items-center justify-center gap-2 bg-[#4c1d95] font-black text-white"
                >
                  <Save size={18} />
                  บันทึก reservation
                </button>
              </div>

              <div className="mt-6">
                <p className="font-black">Reservations ล่าสุด</p>
                <div className="mt-2 grid gap-3">
                  {reservations.map((item) => (
                    <div key={item.id} className="rounded-xl border border-[#7c3aed]/10 bg-white p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-black">{item.title}</p>
                          <p className="text-sm font-bold text-ink/60">{item.user_profiles?.email}</p>
                          <p className="text-sm font-bold text-ink/60">
                            {new Date(item.starts_at).toLocaleString()} - {new Date(item.ends_at).toLocaleTimeString()}
                          </p>
                          <p className="text-sm font-black text-[#6d28d9]">{item.status}</p>
                        </div>
                        {item.status === "confirmed" ? (
                          <button
                            onClick={() => cancelReservation(item.id)}
                            className="grid h-10 w-10 place-items-center rounded-xl border-2 border-coral text-coral"
                            title="ยกเลิก"
                          >
                            <XCircle size={18} />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </main>
  );
}
