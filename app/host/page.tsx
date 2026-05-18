"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Copy, Eye, Plus, Radio, RotateCcw, Trash2 } from "lucide-react";
import { SetupWarning } from "@/components/SetupWarning";
import { emptyQuestion, makeRoomCode, starterQuestions } from "@/lib/quiz";
import { hasSupabaseConfig, requireSupabase } from "@/lib/supabase";
import { Answer, GameSession, Player, Question, Quiz } from "@/lib/types";

const swatches = ["bg-coral", "bg-sky", "bg-gold", "bg-mint"];

export default function HostPage() {
  const [title, setTitle] = useState("Seminar Quiz");
  const [questions, setQuestions] = useState<Question[]>(starterQuestions);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [session, setSession] = useState<GameSession | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const currentQuestion = session ? questions[session.current_question] : null;
  const currentAnswers = useMemo(
    () => answers.filter((answer) => session && answer.question_index === session.current_question),
    [answers, session],
  );
  const uniqueAnswered = new Set(currentAnswers.map((answer) => answer.player_id)).size;
  const counts = currentQuestion
    ? currentQuestion.choices.map((_, index) => currentAnswers.filter((answer) => answer.choice_index === index).length)
    : [];
  const correctCount = currentQuestion
    ? currentAnswers.filter((answer) => answer.choice_index === currentQuestion.correctIndex).length
    : 0;

  useEffect(() => {
    if (!session || !hasSupabaseConfig) {
      return;
    }

    const supabase = requireSupabase();
    void refreshLiveData(session.id);

    const channel = supabase
      .channel(`host-${session.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players", filter: `session_id=eq.${session.id}` },
        () => void refreshPlayers(session.id),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "answers", filter: `session_id=eq.${session.id}` },
        () => void refreshAnswers(session.id),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "game_sessions", filter: `id=eq.${session.id}` },
        (payload) => setSession(payload.new as GameSession),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [session?.id]);

  async function refreshPlayers(sessionId: string) {
    const supabase = requireSupabase();
    const { data } = await supabase.from("players").select("*").eq("session_id", sessionId).order("joined_at");
    setPlayers((data ?? []) as Player[]);
  }

  async function refreshAnswers(sessionId: string) {
    const supabase = requireSupabase();
    const { data } = await supabase.from("answers").select("*").eq("session_id", sessionId);
    setAnswers((data ?? []) as Answer[]);
  }

  async function refreshLiveData(sessionId: string) {
    await Promise.all([refreshPlayers(sessionId), refreshAnswers(sessionId)]);
  }

  function updateQuestion(index: number, patch: Partial<Question>) {
    setQuestions((items) => items.map((question, qIndex) => (qIndex === index ? { ...question, ...patch } : question)));
  }

  function updateChoice(questionIndex: number, choiceIndex: number, text: string) {
    setQuestions((items) =>
      items.map((question, qIndex) =>
        qIndex === questionIndex
          ? {
              ...question,
              choices: question.choices.map((choice, cIndex) => (cIndex === choiceIndex ? { text } : choice)),
            }
          : question,
      ),
    );
  }

  async function createSession() {
    setError("");
    if (!hasSupabaseConfig) {
      setError("Add Supabase environment variables before hosting a live quiz.");
      return;
    }

    const validQuestions = questions.filter((question) => question.prompt.trim() && question.choices.every((choice) => choice.text.trim()));
    if (!title.trim() || validQuestions.length === 0) {
      setError("Add a quiz title and at least one complete question.");
      return;
    }

    setBusy(true);
    try {
      const supabase = requireSupabase();
      const { data: quizData, error: quizError } = await supabase
        .from("quizzes")
        .insert({ title: title.trim(), questions: validQuestions })
        .select()
        .single();

      if (quizError) throw quizError;

      const { data: sessionData, error: sessionError } = await supabase
        .from("game_sessions")
        .insert({
          quiz_id: quizData.id,
          room_code: makeRoomCode(),
          status: "lobby",
          current_question: 0,
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      setQuiz(quizData as Quiz);
      setQuestions((quizData as Quiz).questions);
      setSession(sessionData as GameSession);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create session.");
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(status: GameSession["status"], currentQuestion = session?.current_question ?? 0) {
    if (!session) return;
    setBusy(true);
    try {
      const supabase = requireSupabase();
      const { data, error: sessionError } = await supabase
        .from("game_sessions")
        .update({ status, current_question: currentQuestion })
        .eq("id", session.id)
        .select()
        .single();
      if (sessionError) throw sessionError;
      setSession(data as GameSession);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update session.");
    } finally {
      setBusy(false);
    }
  }

  async function copyJoinLink() {
    if (!session) return;
    await navigator.clipboard.writeText(`${window.location.origin}/join?code=${session.room_code}`);
  }

  return (
    <main className="min-h-screen bg-[#f7f5ef] px-4 py-5 text-ink sm:px-6">
      <div className="mx-auto max-w-7xl">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-ink/65 hover:text-ink">
          <ArrowLeft size={18} />
          Home
        </Link>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-coral">Host console</p>
            <h1 className="text-4xl font-black sm:text-5xl">Run your live quiz</h1>
          </div>
          {session ? (
            <div className="rounded-md bg-ink px-5 py-3 text-white">
              <p className="text-xs font-bold uppercase text-white/50">Room code</p>
              <p className="text-3xl font-black tracking-widest">{session.room_code}</p>
            </div>
          ) : null}
        </div>

        <div className="mt-6">
          <SetupWarning />
        </div>
        {error ? <div className="mb-5 rounded-md border-2 border-coral bg-white p-4 font-bold text-coral">{error}</div> : null}

        {!session ? (
          <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-md bg-white p-5 shadow-panel">
              <label className="text-sm font-black">Quiz title</label>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="mt-2 h-12 w-full rounded-md border-2 border-ink/15 px-3 font-bold outline-none focus:border-ink"
              />
              <button
                onClick={createSession}
                disabled={busy}
                className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-ink px-4 font-black text-white"
              >
                <Radio size={19} />
                Create live room
              </button>
            </div>

            <div className="grid gap-4">
              {questions.map((question, questionIndex) => (
                <div key={questionIndex} className="rounded-md bg-white p-5 shadow-panel">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-black">Question {questionIndex + 1}</p>
                    <button
                      aria-label="Remove question"
                      onClick={() => setQuestions((items) => items.filter((_, index) => index !== questionIndex))}
                      className="grid h-9 w-9 place-items-center rounded-md border-2 border-ink/10 text-ink/55 hover:text-coral"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                  <textarea
                    value={question.prompt}
                    onChange={(event) => updateQuestion(questionIndex, { prompt: event.target.value })}
                    className="mt-3 min-h-20 w-full rounded-md border-2 border-ink/15 p-3 font-bold outline-none focus:border-ink"
                  />
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {question.choices.map((choice, choiceIndex) => (
                      <div key={choiceIndex} className="flex gap-2">
                        <button
                          title="Mark correct answer"
                          onClick={() => updateQuestion(questionIndex, { correctIndex: choiceIndex })}
                          className={`grid h-12 w-12 shrink-0 place-items-center rounded-md text-white ${swatches[choiceIndex]}`}
                        >
                          {question.correctIndex === choiceIndex ? <Check size={20} /> : choiceIndex + 1}
                        </button>
                        <input
                          value={choice.text}
                          onChange={(event) => updateChoice(questionIndex, choiceIndex, event.target.value)}
                          className="h-12 min-w-0 flex-1 rounded-md border-2 border-ink/15 px-3 outline-none focus:border-ink"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <button
                onClick={() => setQuestions((items) => [...items, emptyQuestion()])}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md border-2 border-ink font-black"
              >
                <Plus size={19} />
                Add question
              </button>
            </div>
          </section>
        ) : (
          <section className="grid gap-5 lg:grid-cols-[0.75fr_1.25fr]">
            <aside className="rounded-md bg-white p-5 shadow-panel">
              <div className="grid grid-cols-2 gap-3">
                <button onClick={copyJoinLink} className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-ink font-black text-white">
                  <Copy size={18} />
                  Copy link
                </button>
                <button
                  onClick={() => setStatus("question")}
                  disabled={busy || session.status === "question"}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-mint font-black text-ink"
                >
                  <Radio size={18} />
                  Ask
                </button>
                <button
                  onClick={() => setStatus("results")}
                  disabled={busy || session.status === "results"}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-gold font-black text-ink"
                >
                  <Eye size={18} />
                  Results
                </button>
                <button
                  onClick={() => setStatus("lobby")}
                  disabled={busy}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-md border-2 border-ink font-black"
                >
                  <RotateCcw size={18} />
                  Lobby
                </button>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-md bg-ink p-3 text-white">
                  <p className="text-2xl font-black">{players.length}</p>
                  <p className="text-xs font-bold text-white/55">joined</p>
                </div>
                <div className="rounded-md bg-ink p-3 text-white">
                  <p className="text-2xl font-black">{uniqueAnswered}</p>
                  <p className="text-xs font-bold text-white/55">answered</p>
                </div>
                <div className="rounded-md bg-ink p-3 text-white">
                  <p className="text-2xl font-black">{correctCount}</p>
                  <p className="text-xs font-bold text-white/55">correct</p>
                </div>
              </div>
              <div className="mt-5">
                <p className="font-black">Students</p>
                <div className="mt-2 max-h-64 overflow-auto rounded-md border-2 border-ink/10">
                  {players.length ? (
                    players.map((player) => <div key={player.id} className="border-b border-ink/10 px-3 py-2 font-bold">{player.name}</div>)
                  ) : (
                    <p className="px-3 py-4 text-sm font-bold text-ink/50">Waiting for students...</p>
                  )}
                </div>
              </div>
            </aside>

            <div className="rounded-md bg-white p-5 shadow-panel">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-ink/50">
                    {quiz?.title} · Question {session.current_question + 1} of {questions.length}
                  </p>
                  <h2 className="mt-2 text-3xl font-black">{currentQuestion?.prompt}</h2>
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={busy || session.current_question === 0}
                    onClick={() => setStatus("question", session.current_question - 1)}
                    className="h-11 rounded-md border-2 border-ink px-4 font-black"
                  >
                    Prev
                  </button>
                  <button
                    disabled={busy || session.current_question >= questions.length - 1}
                    onClick={() => setStatus("question", session.current_question + 1)}
                    className="h-11 rounded-md bg-ink px-4 font-black text-white"
                  >
                    Next
                  </button>
                </div>
              </div>
              <div className="mt-6 grid gap-3">
                {currentQuestion?.choices.map((choice, index) => {
                  const total = Math.max(1, currentAnswers.length);
                  const percentage = Math.round((counts[index] / total) * 100);
                  return (
                    <div key={index} className="overflow-hidden rounded-md border-2 border-ink/10">
                      <div className={`${swatches[index]} flex items-center justify-between px-4 py-3 font-black text-white`}>
                        <span>{choice.text}</span>
                        <span>{counts[index] ?? 0}</span>
                      </div>
                      <div className="h-3 bg-ink/5">
                        <div className="h-full bg-ink transition-all" style={{ width: `${percentage}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <button
                onClick={() => setStatus("ended")}
                className="mt-6 h-11 rounded-md border-2 border-coral px-4 font-black text-coral"
              >
                End quiz
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
