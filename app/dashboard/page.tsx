"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BarChart3, CheckCircle2, CircleDashed, RefreshCw, UsersRound } from "lucide-react";
import { SetupWarning } from "@/components/SetupWarning";
import { getErrorMessage } from "@/lib/errors";
import { hasSupabaseConfig, requireSupabase } from "@/lib/supabase";
import { Answer, GameSession, Player, Quiz, UserProfile } from "@/lib/types";

const chartColors = ["#fb7185", "#60a5fa", "#facc15", "#34d399"];
const answerSymbols = ["▲", "◆", "●", "■"];

type SessionOption = GameSession & {
  quiz_title?: string;
};

export default function DashboardPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [session, setSession] = useState<GameSession | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void loadDashboard();
  }, []);

  useEffect(() => {
    if (selectedSessionId) {
      void loadSessionStats(selectedSessionId);
    }
  }, [selectedSessionId]);

  const questionStats = useMemo(() => {
    if (!quiz) return [];

    return quiz.questions.map((question, questionIndex) => {
      const questionAnswers = answers.filter((answer) => answer.question_index === questionIndex);
      const answeredPlayers = new Set(questionAnswers.map((answer) => answer.player_id)).size;
      const totalAnswers = Math.max(1, questionAnswers.length);
      const choices = question.choices.map((choice, choiceIndex) => {
        const count = questionAnswers.filter((answer) => answer.choice_index === choiceIndex).length;
        return {
          choice,
          choiceIndex,
          count,
          percentage: Math.round((count / totalAnswers) * 100),
          isCorrect: question.correctIndex === choiceIndex,
        };
      });

      return {
        question,
        questionIndex,
        answeredPlayers,
        unansweredPlayers: Math.max(0, players.length - answeredPlayers),
        choices,
      };
    });
  }, [answers, players.length, quiz]);

  async function loadDashboard() {
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

      const { data: profileData, error: profileError } = await supabase.from("user_profiles").select("*").eq("id", userData.user.id).single();
      if (profileError) throw profileError;
      const nextProfile = profileData as UserProfile;
      setProfile(nextProfile);

      if (nextProfile.role !== "admin" && nextProfile.role !== "host_manager") {
        setMessage("หน้านี้สำหรับ admin หรือ host manager เท่านั้น");
        return;
      }

      const { data: sessionRows, error: sessionsError } = await supabase
        .from("game_sessions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(25);
      if (sessionsError) throw sessionsError;

      const sessionItems = (sessionRows ?? []) as GameSession[];
      const quizIds = [...new Set(sessionItems.map((item) => item.quiz_id))];
      const { data: quizRows, error: quizError } = quizIds.length
        ? await supabase.from("quizzes").select("id,title").in("id", quizIds)
        : { data: [], error: null };
      if (quizError) throw quizError;

      const quizTitleById = new Map((quizRows ?? []).map((item) => [item.id as string, item.title as string]));
      const options = sessionItems.map((item) => ({ ...item, quiz_title: quizTitleById.get(item.quiz_id) ?? "Live Quiz" }));
      setSessions(options);
      setSelectedSessionId((current) => current || options[0]?.id || "");
    } catch (err) {
      setMessage(getErrorMessage(err, "โหลด dashboard ไม่สำเร็จ"));
    } finally {
      setBusy(false);
    }
  }

  async function loadSessionStats(sessionId: string) {
    setBusy(true);
    setMessage("");
    try {
      const supabase = requireSupabase();
      const { data: sessionData, error: sessionError } = await supabase.from("game_sessions").select("*").eq("id", sessionId).single();
      if (sessionError) throw sessionError;
      const nextSession = sessionData as GameSession;

      const [{ data: quizData, error: quizError }, { data: answerRows, error: answerError }, { data: playerRows, error: playerError }] = await Promise.all([
        supabase.from("quizzes").select("*").eq("id", nextSession.quiz_id).single(),
        supabase.from("answers").select("*").eq("session_id", sessionId),
        supabase.from("players").select("*").eq("session_id", sessionId).order("joined_at"),
      ]);

      if (quizError) throw quizError;
      if (answerError) throw answerError;
      if (playerError) throw playerError;

      setSession(nextSession);
      setQuiz(quizData as Quiz);
      setAnswers((answerRows ?? []) as Answer[]);
      setPlayers((playerRows ?? []) as Player[]);
    } catch (err) {
      setMessage(getErrorMessage(err, "โหลดสถิติห้องนี้ไม่สำเร็จ"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="thai-bg soft-grid min-h-screen px-4 py-6 text-ink sm:px-6">
      <div className="mx-auto max-w-7xl">
        <Link href="/" className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-2 text-sm font-bold text-ink/70 shadow-panel hover:text-ink">
          <ArrowLeft size={18} />
          หน้าแรก
        </Link>

        <div className="mt-5">
          <SetupWarning />
        </div>

        <section className="thai-header mt-5 rounded-2xl p-6 text-white">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-white/70">Analytics Dashboard</p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-4xl font-black sm:text-6xl">สถิติคำตอบรายข้อ</h1>
              <p className="mt-2 max-w-2xl font-bold text-white/75">ดูว่าแต่ละข้อผู้เล่นเลือก choice ไหน คิดเป็นสัดส่วนกี่เปอร์เซ็นต์</p>
            </div>
            <button
              onClick={() => selectedSessionId ? void loadSessionStats(selectedSessionId) : void loadDashboard()}
              disabled={busy}
              className="thai-button inline-flex h-12 items-center gap-2 bg-white px-5 font-black text-[#4c1d95]"
            >
              <RefreshCw size={18} />
              รีเฟรช
            </button>
          </div>
        </section>

        {message ? <p className="mt-4 rounded-xl bg-white p-3 font-bold text-[#6d28d9] shadow-panel">{message}</p> : null}

        {profile?.role === "admin" || profile?.role === "host_manager" ? (
          <section className="mt-5 grid gap-5">
            <div className="thai-panel rounded-2xl p-5">
              <label className="block text-sm font-black text-[#4c1d95]">เลือกห้อง Live Quiz</label>
              <select
                value={selectedSessionId}
                onChange={(event) => setSelectedSessionId(event.target.value)}
                className="mt-2 h-12 w-full rounded-xl border-2 border-[#7c3aed]/15 bg-white px-3 font-bold outline-none focus:border-[#7c3aed]"
              >
                {sessions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.quiz_title} · {item.room_code} · {item.status} · {formatDate(item.created_at)}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard icon={<UsersRound size={22} />} label="ผู้เล่นทั้งหมด" value={players.length} />
              <StatCard icon={<BarChart3 size={22} />} label="คำตอบทั้งหมด" value={answers.length} />
              <StatCard icon={<CircleDashed size={22} />} label="จำนวนคำถาม" value={quiz?.questions.length ?? 0} />
            </div>

            {quiz && session ? (
              <div className="grid gap-5">
                {questionStats.map((item) => (
                  <QuestionChartCard
                    key={item.questionIndex}
                    questionIndex={item.questionIndex}
                    prompt={item.question.prompt}
                    answeredPlayers={item.answeredPlayers}
                    unansweredPlayers={item.unansweredPlayers}
                    totalPlayers={players.length}
                    choices={item.choices}
                  />
                ))}
              </div>
            ) : (
              <div className="thai-panel rounded-2xl p-8 text-center font-bold text-ink/55">ยังไม่มีข้อมูลห้องให้แสดง</div>
            )}
          </section>
        ) : null}
      </div>
    </main>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="thai-panel rounded-2xl p-5">
      <div className="flex items-center gap-2 font-black text-[#6d28d9]">
        {icon}
        {label}
      </div>
      <p className="mt-3 text-4xl font-black">{value}</p>
    </div>
  );
}

function QuestionChartCard({
  questionIndex,
  prompt,
  answeredPlayers,
  unansweredPlayers,
  totalPlayers,
  choices,
}: {
  questionIndex: number;
  prompt: string;
  answeredPlayers: number;
  unansweredPlayers: number;
  totalPlayers: number;
  choices: Array<{
    choice: { text: string };
    choiceIndex: number;
    count: number;
    percentage: number;
    isCorrect: boolean;
  }>;
}) {
  const gradient = buildConicGradient(choices);

  return (
    <article className="thai-panel rounded-2xl p-5">
      <div className="grid gap-6 lg:grid-cols-[320px_1fr] lg:items-center">
        <div className="flex flex-col items-center">
          <div className="relative grid h-64 w-64 place-items-center rounded-full shadow-panel" style={{ background: gradient }}>
            <div className="grid h-32 w-32 place-items-center rounded-full bg-white text-center shadow-panel">
              <div>
                <p className="text-4xl font-black">{answeredPlayers}</p>
                <p className="text-xs font-bold text-ink/55">ตอบแล้ว</p>
              </div>
            </div>
          </div>
          <p className="mt-3 text-center text-sm font-bold text-ink/55">
            ผู้เล่นทั้งหมด {totalPlayers} คน · ยังไม่ตอบ {unansweredPlayers} คน
          </p>
        </div>

        <div>
          <p className="inline-flex rounded-full bg-[#ede9fe] px-3 py-1 text-sm font-black text-[#6d28d9]">ข้อ {questionIndex + 1}</p>
          <h2 className="mt-3 text-2xl font-black leading-tight sm:text-3xl">{prompt}</h2>
          <div className="mt-5 grid gap-3">
            {choices.map((item) => (
              <div key={item.choiceIndex} className="rounded-2xl border border-[#7c3aed]/10 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-xl font-black text-white"
                      style={{ backgroundColor: chartColors[item.choiceIndex] }}
                    >
                      {answerSymbols[item.choiceIndex]}
                    </span>
                    <div className="min-w-0">
                      <p className="font-black">{item.choice.text}</p>
                      {item.isCorrect ? (
                        <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-xs font-black text-emerald-700">
                          <CheckCircle2 size={14} />
                          คำตอบที่ถูก
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-black">{item.percentage}%</p>
                    <p className="text-xs font-bold text-ink/50">{item.count} คน</p>
                  </div>
                </div>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-[#ede9fe]">
                  <div className="h-full rounded-full transition-all" style={{ width: `${item.percentage}%`, backgroundColor: chartColors[item.choiceIndex] }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

function buildConicGradient(
  choices: Array<{
    choiceIndex: number;
    percentage: number;
  }>,
) {
  let cursor = 0;
  const segments = choices
    .filter((choice) => choice.percentage > 0)
    .map((choice) => {
      const start = cursor;
      const end = cursor + choice.percentage;
      cursor = end;
      return `${chartColors[choice.choiceIndex]} ${start}% ${end}%`;
    });

  if (!segments.length) {
    return "conic-gradient(#e5e7eb 0% 100%)";
  }

  if (cursor < 100) {
    segments.push(`#e5e7eb ${cursor}% 100%`);
  }

  return `conic-gradient(${segments.join(", ")})`;
}

function formatDate(value?: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
