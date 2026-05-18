import Link from "next/link";
import { Gamepad2, Presentation, UsersRound } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f7f5ef]">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-6 sm:px-8">
        <nav className="flex items-center justify-between py-3">
          <div className="flex items-center gap-2 text-xl font-black">
            <span className="grid h-10 w-10 place-items-center rounded-md bg-ink text-white">
              <Gamepad2 size={22} />
            </span>
            Quezz Live
          </div>
          <div className="hidden items-center gap-2 text-sm font-semibold text-ink/65 sm:flex">
            <UsersRound size={18} />
            Built for 40-student seminars
          </div>
        </nav>

        <div className="grid flex-1 items-center gap-10 py-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="mb-4 text-sm font-bold uppercase tracking-widest text-coral">Live classroom quiz</p>
            <h1 className="max-w-3xl text-5xl font-black leading-[0.98] text-ink sm:text-7xl">
              Run a Kahoot-style seminar from your browser.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-ink/70">
              Create a quiz, show a room code, let students answer from their phones, and watch the results update live.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/host"
                className="inline-flex h-14 items-center justify-center gap-2 rounded-md bg-ink px-6 font-bold text-white shadow-panel transition hover:-translate-y-0.5"
              >
                <Presentation size={20} />
                Host a quiz
              </Link>
              <Link
                href="/join"
                className="inline-flex h-14 items-center justify-center rounded-md border-2 border-ink px-6 font-bold text-ink transition hover:-translate-y-0.5"
              >
                Join with code
              </Link>
            </div>
          </div>

          <div className="relative min-h-[420px] overflow-hidden rounded-lg bg-ink p-4 text-white shadow-panel">
            <div className="absolute inset-x-0 top-0 h-2 bg-[linear-gradient(90deg,#f45d48,#f4b942,#2fbf9b,#3096dc)]" />
            <div className="grid h-full grid-rows-[auto_1fr_auto] gap-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/55">Room code</p>
                  <p className="text-4xl font-black tracking-widest">QZ482K</p>
                </div>
                <span className="rounded-md bg-mint px-3 py-2 text-sm font-black text-ink">Live</span>
              </div>
              <div className="rounded-md bg-white p-5 text-ink">
                <p className="text-sm font-bold text-ink/50">Question 2 of 5</p>
                <h2 className="mt-3 text-3xl font-black">Which tool stores the quiz answers?</h2>
                <div className="mt-6 grid gap-3">
                  {["Supabase", "Vercel DNS", "Tailwind", "Git ignore"].map((choice, index) => (
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
                {["32 joined", "28 answered", "84% correct"].map((stat) => (
                  <div key={stat} className="rounded-md bg-white/10 p-4 text-center font-bold">
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
