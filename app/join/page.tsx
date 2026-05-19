"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Check, LogIn, Timer, Trophy } from "lucide-react";
import { SetupWarning } from "@/components/SetupWarning";
import { getErrorMessage } from "@/lib/errors";
import { calculateAnswerScore } from "@/lib/quiz";
import { playCountdownMusic, playSound, stopAllMusic, stopCountdownMusic } from "@/lib/sound";
import { hasSupabaseConfig, requireSupabase } from "@/lib/supabase";
import { Answer, GameSession, Player, Quiz } from "@/lib/types";

const swatches = ["bg-coral", "bg-sky", "bg-gold", "bg-mint"];

export default function JoinPage() {
  return (
    <Suspense fallback={<JoinShell />}>
      <JoinExperience />
    </Suspense>
  );
}

function JoinShell() {
  return (
    <main className="soft-grid min-h-screen px-4 py-5 text-ink sm:px-6">
      <div className="cute-panel mx-auto max-w-3xl rounded-lg p-8">
        <p className="font-black">กำลังโหลด...</p>
      </div>
    </main>
  );
}

function JoinExperience() {
  const searchParams = useSearchParams();
  const [roomCode, setRoomCode] = useState(searchParams.get("code") ?? "");
  const [name, setName] = useState("");
  const [session, setSession] = useState<GameSession | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [timeLeft, setTimeLeft] = useState(20);
  const lastSoundKeyRef = useRef("");
  const countdownSoundRef = useRef("");

  const currentQuestion = session && quiz ? quiz.questions[session.current_question] : null;
  const currentAnswer = useMemo(
    () => answers.find((answer) => session && answer.question_index === session.current_question),
    [answers, session],
  );
  const score = useMemo(() => {
    if (!quiz) return 0;
    return answers.reduce((total, answer) => total + calculateAnswerScore(answer, quiz.questions[answer.question_index], session), 0);
  }, [answers, quiz, session]);
  const timerProgress =
    session?.status === "question" ? Math.max(0, Math.min(100, (timeLeft / Math.max(1, session.question_duration)) * 100)) : 0;

  useEffect(() => {
    const savedName = window.localStorage.getItem("quezz-player-name");
    if (savedName) setName(savedName);
  }, []);

  useEffect(() => {
    if (!session || !player || !hasSupabaseConfig) {
      return;
    }

    const supabase = requireSupabase();
    void refreshAnswers(player.id);

    const channel = supabase
      .channel(`student-${session.id}-${player.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "game_sessions", filter: `id=eq.${session.id}` },
        (payload) => setSession(payload.new as GameSession),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "answers", filter: `player_id=eq.${player.id}` },
        () => void refreshAnswers(player.id),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [session?.id, player?.id]);

  useEffect(() => {
    if (!session) return;

    const soundKey = `${session.status}-${session.current_question}-${session.question_started_at ?? ""}`;
    if (lastSoundKeyRef.current !== soundKey) {
      lastSoundKeyRef.current = soundKey;
      if (session.status === "question") void playSound("question");
      if (session.status === "results") {
        stopCountdownMusic();
        void playSound("results");
      }
      if (session.status === "ended") {
        stopAllMusic();
        void playSound("end");
      }
    }
  }, [session?.status, session?.current_question, session?.question_started_at]);

  useEffect(() => {
    return () => {
      stopAllMusic();
    };
  }, []);

  useEffect(() => {
    if (!session || session.status !== "question" || !session.question_started_at) {
      setTimeLeft(session?.question_duration ?? 20);
      return;
    }

    const updateRemaining = () => {
      const startedAt = new Date(session.question_started_at ?? Date.now()).getTime();
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const nextTimeLeft = Math.max(0, session.question_duration - elapsed);
      setTimeLeft(nextTimeLeft);

      const countdownKey = `${session.id}-${session.current_question}-${session.question_started_at}`;
      if (nextTimeLeft > 0 && countdownSoundRef.current !== countdownKey) {
        countdownSoundRef.current = countdownKey;
        void playCountdownMusic(session.current_question, countdownKey);
      }

      if (nextTimeLeft <= 0) {
        stopCountdownMusic();
      }
    };

    updateRemaining();
    const intervalId = window.setInterval(updateRemaining, 1000);
    return () => window.clearInterval(intervalId);
  }, [session?.id, session?.status, session?.current_question, session?.question_started_at, session?.question_duration]);

  async function refreshAnswers(playerId: string) {
    const supabase = requireSupabase();
    const { data } = await supabase.from("answers").select("*").eq("player_id", playerId);
    setAnswers((data ?? []) as Answer[]);
  }

  async function joinRoom() {
    setError("");
    if (!hasSupabaseConfig) {
      setError("Supabase is not connected yet.");
      return;
    }
    if (!roomCode.trim() || !name.trim()) {
      setError("Enter your name and room code.");
      return;
    }

    setBusy(true);
    try {
      const supabase = requireSupabase();
      const cleanCode = roomCode.trim().toUpperCase();
      const { data: sessionData, error: sessionError } = await supabase
        .from("game_sessions")
        .select("*")
        .eq("room_code", cleanCode)
        .neq("status", "ended")
        .single();

      if (sessionError) throw new Error("Room not found. Check the code on the host screen.");

      const { data: quizData, error: quizError } = await supabase.from("quizzes").select("*").eq("id", sessionData.quiz_id).single();
      if (quizError) throw quizError;

      const storageKey = `quezz-player-${sessionData.id}`;
      const existingPlayerId = window.localStorage.getItem(storageKey);
      let playerData: Player | null = null;

      if (existingPlayerId) {
        const { data } = await supabase.from("players").select("*").eq("id", existingPlayerId).single();
        playerData = data as Player | null;
      }

      if (!playerData) {
        const { data, error: playerError } = await supabase
          .from("players")
          .insert({ session_id: sessionData.id, name: name.trim() })
          .select()
          .single();
        if (playerError) throw playerError;
        playerData = data as Player;
        window.localStorage.setItem(storageKey, playerData.id);
      }

      window.localStorage.setItem("quezz-player-name", name.trim());
      setSession(sessionData as GameSession);
      setQuiz(quizData as Quiz);
      setPlayer(playerData);
      await refreshAnswers(playerData.id);
    } catch (err) {
      setError(getErrorMessage(err, "Could not join room."));
    } finally {
      setBusy(false);
    }
  }

  async function submitAnswer(choiceIndex: number) {
    if (!session || !player) return;
    setBusy(true);
    setError("");
    try {
      const supabase = requireSupabase();
      void playSound("answer");
      const { data, error: answerError } = await supabase
        .from("answers")
        .upsert(
          {
            session_id: session.id,
            player_id: player.id,
            question_index: session.current_question,
            choice_index: choiceIndex,
          },
          { onConflict: "session_id,player_id,question_index" },
        )
        .select()
        .single();
      if (answerError) throw answerError;
      setAnswers((items) => [...items.filter((answer) => answer.id !== data.id && answer.question_index !== session.current_question), data as Answer]);
    } catch (err) {
      setError(getErrorMessage(err, "Could not submit answer."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="soft-grid min-h-screen px-4 py-5 text-ink sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-ink/65 hover:text-ink">
          <ArrowLeft size={18} />
          หน้าแรก
        </Link>

        <div className="mt-6">
          <SetupWarning />
        </div>
        {error ? <div className="mb-5 rounded-md border-2 border-coral bg-white p-4 font-bold text-coral">{error}</div> : null}

        {!session || !quiz || !player ? (
          <section className="cute-panel rounded-lg p-5 sm:p-8">
            <p className="text-sm font-bold uppercase tracking-widest text-coral">หน้าผู้เล่น</p>
            <h1 className="mt-2 text-4xl font-black">เข้าร่วมควิซ</h1>
            <div className="mt-6 grid gap-4">
              <label className="font-black">
                ชื่อของคุณ
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="mt-2 h-12 w-full rounded-md border-2 border-ink/15 px-3 outline-none focus:border-ink"
                />
              </label>
              <label className="font-black">
                รหัสห้อง
                <input
                  value={roomCode}
                  onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
                  className="mt-2 h-14 w-full rounded-md border-2 border-ink/15 px-3 text-center text-3xl font-black uppercase tracking-widest outline-none focus:border-ink"
                  maxLength={6}
                />
              </label>
              <button
                onClick={joinRoom}
                disabled={busy}
                className="inline-flex h-14 items-center justify-center gap-2 rounded-md bg-ink px-5 font-black text-white"
              >
                <LogIn size={20} />
                เข้าร่วม
              </button>
            </div>
          </section>
        ) : (
          <section className="cute-panel overflow-hidden rounded-lg p-5 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-ink/50">{quiz.title}</p>
                <h1 className="text-3xl font-black">สวัสดี {player.name}</h1>
              </div>
              <div className="rounded-md bg-ink px-4 py-3 text-white">
                <p className="text-xs font-bold uppercase text-white/50">คะแนน</p>
                <p className="text-2xl font-black">
                  {score}
                </p>
              </div>
            </div>

            {session.status === "lobby" ? (
              <div className="mt-8 rounded-lg bg-[#4c1d95] p-8 text-center text-white shadow-panel">
                <p className="text-2xl font-black">เข้าห้องเรียบร้อย</p>
                <p className="mt-2 text-white/70">รอผู้จัดกิจกรรมเริ่มคำถามถัดไป</p>
              </div>
            ) : null}

            {session.status === "ended" ? (
              <div className="winner-bg mt-8 rounded-xl p-8 text-center text-white shadow-panel">
                <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-white text-[#4c1d95] shadow-panel">
                  <Trophy size={46} />
                </div>
                <p className="mt-5 text-3xl font-black text-[#4c1d95] drop-shadow-sm">จบเกมแล้ว</p>
                <p className="mt-2 inline-flex rounded-md bg-white/90 px-4 py-2 text-xl font-black text-ink">
                  คะแนนของคุณ {score}/{quiz.questions.length * 1000}
                </p>
              </div>
            ) : null}

            {currentQuestion && (session.status === "question" || session.status === "results") ? (
              <div className="mt-7">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-bold text-ink/50">
                    คำถามที่ {session.current_question + 1} จาก {quiz.questions.length}
                  </p>
                  <div className="flex min-w-32 items-center gap-2 rounded-md bg-ink px-3 py-2 font-black text-white">
                    <Timer size={18} />
                    {session.status === "question" ? `${timeLeft}s` : "เฉลย"}
                  </div>
                </div>
                {session.status === "question" ? (
                  <div className="mt-3 h-3 overflow-hidden rounded-full bg-ink/10">
                    <div className="h-full bg-coral transition-all" style={{ width: `${timerProgress}%` }} />
                  </div>
                ) : null}
                <h2 className="mt-2 text-3xl font-black">{currentQuestion.prompt}</h2>
                {currentQuestion.imageUrl ? (
                  <img
                    src={currentQuestion.imageUrl}
                    alt="รูปประกอบคำถาม"
                    className="mt-4 max-h-72 w-full rounded-2xl object-contain shadow-panel"
                  />
                ) : null}
                <div className="mt-6 grid gap-3">
                  {currentQuestion.choices.map((choice, index) => {
                    const isSelected = currentAnswer?.choice_index === index;
                    const isCorrect = currentQuestion.correctIndex === index;
                    return (
                      <button
                        key={index}
                        onClick={() => submitAnswer(index)}
                        disabled={busy || session.status === "results"}
                        className={`${swatches[index]} flex min-h-16 items-center justify-between rounded-md px-4 py-3 text-left text-lg font-black text-white transition hover:-translate-y-0.5 ${
                          isSelected ? "ring-4 ring-ink" : ""
                        }`}
                      >
                        <span>{choice.text}</span>
                        {session.status === "results" && isCorrect ? <Check size={22} /> : null}
                      </button>
                    );
                  })}
                </div>
                {currentAnswer ? (
                  <p className="mt-4 rounded-md bg-ink/5 p-3 text-center font-bold">
                    {session.status === "results" ? "ล็อกคำตอบแล้ว" : "ส่งคำตอบแล้ว เปลี่ยนได้จนกว่าจะเฉลย"}
                  </p>
                ) : null}
              </div>
            ) : null}
          </section>
        )}
      </div>
    </main>
  );
}
