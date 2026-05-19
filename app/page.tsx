import Link from "next/link";
import { Gamepad2, Presentation, UsersRound } from "lucide-react";

export default function Home() {
  return (
    <main className="soft-grid min-h-screen">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-6 sm:px-8">
        <nav className="flex items-center justify-between py-3">
          <div className="flex items-center gap-2 text-xl font-black">
            <span className="grid h-10 w-10 place-items-center rounded-md bg-[#4c1d95] text-white">
              <Gamepad2 size={22} />
            </span>
            Quezz Live
          </div>
          <div className="hidden items-center gap-2 text-sm font-semibold text-ink/65 sm:flex">
            <UsersRound size={18} />
            พร้อมสำหรับ seminar 40 คน
          </div>
        </nav>

        <div className="grid flex-1 items-center gap-10 py-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="mb-4 text-sm font-bold uppercase tracking-widest text-coral">ควิซสดในห้องเรียน</p>
            <h1 className="max-w-3xl text-5xl font-black leading-[0.98] text-ink sm:text-7xl">
              เล่นควิซ seminar แบบสนุก ๆ ผ่าน browser
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-ink/70">
              สร้างห้อง แจกโค้ดให้นักเรียนตอบจากมือถือ แล้วดูผลคะแนนสดพร้อมเพลงและตัวจับเวลา
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/host"
                className="inline-flex h-14 items-center justify-center gap-2 rounded-md bg-[#4c1d95] px-6 font-bold text-white shadow-panel transition hover:-translate-y-0.5"
              >
                <Presentation size={20} />
                เปิดห้องควิซ
              </Link>
              <Link
                href="/join"
                className="inline-flex h-14 items-center justify-center rounded-md border-2 border-ink px-6 font-bold text-ink transition hover:-translate-y-0.5"
              >
                เข้าร่วมด้วยรหัส
              </Link>
            </div>
          </div>

          <div className="cute-panel relative min-h-[420px] overflow-hidden rounded-xl p-4 text-white">
            <div className="absolute inset-x-0 top-0 h-2 bg-[linear-gradient(90deg,#fb7185,#facc15,#34d399,#60a5fa,#a78bfa)]" />
            <div className="grid h-full grid-rows-[auto_1fr_auto] gap-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-ink/55">รหัสห้อง</p>
                  <p className="text-4xl font-black tracking-widest text-[#4c1d95]">QZ482K</p>
                </div>
                <span className="rounded-md bg-mint px-3 py-2 text-sm font-black text-ink">กำลังเล่น</span>
              </div>
              <div className="rounded-lg bg-white p-5 text-ink shadow-panel">
                <p className="text-sm font-bold text-ink/50">คำถามที่ 2 จาก 5</p>
                <h2 className="mt-3 text-3xl font-black">ข้อใดคือการใช้ AI ที่ปลอดภัย?</h2>
                <div className="mt-6 grid gap-3">
                  {["ไม่ใส่ข้อมูลคนไข้", "ส่ง HN เข้า AI", "เชื่อทันที", "ให้ AI ตัดสินใจแทน"].map((choice, index) => (
                    <div
                      key={choice}
                      className={`rounded-md px-4 py-3 font-bold text-white ${
                        ["bg-coral", "bg-sky", "bg-gold text-ink", "bg-mint text-ink"][index]
                      }`}
                    >
                      {choice}
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {["32 เข้าร่วม", "28 ตอบแล้ว", "84% ถูก"].map((stat) => (
                  <div key={stat} className="rounded-md bg-[#4c1d95] p-4 text-center font-bold">
                    {stat}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
