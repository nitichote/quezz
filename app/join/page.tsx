"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Check, LogIn, Timer, Trophy } from "lucide-react";
import { SetupWarning } from "@/components/SetupWarning";
import { playSound } from "@/lib/sound";
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
    <main className="min-h-screen bg-[#f7f5ef] px-4 py-5 text-ink sm:px-6">
      <div className="mx-auto max-w-3xl rounded-md bg-white p-8 shadow-panel">
        <p className="font-black">Loading join screen...</p>
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

  const currentQuestion = session && quiz ? quiz.questions[session.current_question] : null;
  const currentAnswer = useMemo(
    () => answers.find((answer) => session && answer.question_index === session.current_question),
    [answers, session],
  );
  const score = useMemo(() => {
    if (!quiz) return 0;
    return answers.filter((answer) => quiz.questions[answer.question_index]?.correctIndex === answer.choice_index).length;
  }, [answers, quiz]);
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
      if (session.status === "results") void playSound("results");
      if (session.status === "ended") void playSound("end");
    }
  }, [session?.status, session?.current_question, session?.question_started_at]);

  useEffect(() => {
    if (!session || session.status !== "question" || !session.question_started_at) {
      setTimeLeft(session?.question_duration ?? 20);
      return;
    }

    const updateRemaining = () => {
      const startedAt = new Date(session.question_started_at ?? Date.now()).getTime();
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      setTimeLeft(Math.max(0, session.question_duration - elapsed));
    };

    updateRemaining();
    const intervalId = window.setInterval(updateRemaining, 1000);
    return () => window.clearInterval(intervalId);
  }, [session?.status, session?.question_started_at, session?.question_duration]);

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
      setError(err instanceof Error ? err.message : "Could not join room.");
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
      setError(err instanceof Error ? err.message : "Could not submit answer.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f5ef] px-4 py-5 text-ink sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-ink/65 hover:text-ink">
          <ArrowLeft size={18} />
          Home
        </Link>

        <div className="mt-6">
          <SetupWarning />
        </div>
        {error ? <div className="mb-5 rounded-md border-2 border-coral bg-white p-4 font-bold text-coral">{error}</div> : null}

        {!session || !quiz || !player ? (
          <section className="rounded-md bg-white p-5 shadow-panel sm:p-8">
            <p className="text-sm font-bold uppercase tracking-widest text-coral">Student view</p>
            <h1 className="mt-2 text-4xl font-black">Join the quiz</h1>
            <div className="mt-6 grid gap-4">
              <label className="font-black">
                Your name
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="mt-2 h-12 w-full rounded-md border-2 border-ink/15 px-3 outline-none focus:border-ink"
                />
              </label>
              <label className="font-black">
                Room code
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
                Join
              </button>
            </div>
          </section>
        ) : (
          <section className="rounded-md bg-white p-5 shadow-panel sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-ink/50">{quiz.title}</p>
                <h1 className="text-3xl font-black">Hi, {player.name}</h1>
              </div>
              <div className="rounded-md bg-ink px-4 py-3 text-white">
                <p className="text-xs font-bold uppercase text-white/50">Score</p>
                <p className="text-2xl font-black">
                  {score}/{quiz.questions.length}
                </p>
              </div>
            </div>

            {session.status === "lobby" ? (
              <div className="mt-8 rounded-md bg-ink p-8 text-center text-white">
                <p className="text-2xl font-black">You are in.</p>
                <p className="mt-2 text-white/65">Wait for the host to start the next question.</p>
              </div>
            ) : null}

            {session.status === "ended" ? (
              <div className="mt-8 rounded-md bg-mint p-8 text-center text-ink">
                <Trophy className="mx-auto" size={42} />
                <p className="mt-3 text-2xl font-black">Quiz finished</p>
                <p className="mt-2 font-bold">Final score: {score}</p>
              </div>
            ) : null}

            {currentQuestion && (session.status === "question" || session.status === "results") ? (
              <div className="mt-7">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-bold text-ink/50">
                    Question {session.current_question + 1} of {quiz.questions.length}
                  </p>
                  <div className="flex min-w-32 items-center gap-2 rounded-md bg-ink px-3 py-2 font-black text-white">
                    <Timer size={18} />
                    {session.status === "question" ? `${timeLeft}s` : "Results"}
                  </div>
                </div>
                {session.status === "question" ? (
                  <div className="mt-3 h-3 overflow-hidden rounded-full bg-ink/10">
                    <div className="h-full bg-coral transition-all" style={{ width: `${timerProgress}%` }} />
                  </div>
                ) : null}
                <h2 className="mt-2 text-3xl font-black">{currentQuestion.prompt}</h2>
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
                    {session.status === "results" ? "Answer locked." : "Answer submitted. You can change it until results show."}
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
