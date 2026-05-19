"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, Copy, Crown, Eye, Medal, Plus, Radio, RotateCcw, Timer, Trash2, Trophy, Volume2, VolumeX } from "lucide-react";
import { SetupWarning } from "@/components/SetupWarning";
import { getErrorMessage } from "@/lib/errors";
import { calculateAnswerScore, emptyQuestion, makeRoomCode, parseQuestionsCsv, starterQuestions } from "@/lib/quiz";
import { announceWinnerWithGemini, playCountdownMusic, playSound, startLobbyMusic, stopAllMusic, stopCountdownMusic, stopLobbyMusic } from "@/lib/sound";
import { hasSupabaseConfig, requireSupabase } from "@/lib/supabase";
import { Answer, GameSession, Player, Question, Quiz } from "@/lib/types";

const swatches = ["bg-coral", "bg-sky", "bg-gold", "bg-mint"];

export default function HostPage() {
  const [title, setTitle] = useState("ควิซ AI สำหรับบุคลากรการแพทย์");
  const [questions, setQuestions] = useState<Question[]>(starterQuestions);
  const [questionLimit, setQuestionLimit] = useState(starterQuestions.length);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [session, setSession] = useState<GameSession | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [timerSeconds, setTimerSeconds] = useState(10);
  const [resultsSeconds, setResultsSeconds] = useState(5);
  const [timeLeft, setTimeLeft] = useState(10);
  const [autoNext, setAutoNext] = useState(true);
  const [musicOn, setMusicOn] = useState(false);
  const autoActionRef = useRef("");
  const countdownSoundRef = useRef("");
  const winnerAnnouncedRef = useRef("");

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
  const leaderboard = useMemo(() => {
    return players
      .map((player) => {
        const playerAnswers = answers.filter((answer) => answer.player_id === player.id);
        const score = playerAnswers.reduce((total, answer) => total + calculateAnswerScore(answer, questions[answer.question_index], session), 0);
        return { ...player, score, answeredCount: playerAnswers.length };
      })
      .sort((a, b) => b.score - a.score || b.answeredCount - a.answeredCount || a.name.localeCompare(b.name));
  }, [answers, players, questions]);
  const timerProgress =
    session?.status === "question" ? Math.max(0, Math.min(100, (timeLeft / Math.max(1, session.question_duration)) * 100)) : 0;

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

  useEffect(() => {
    return () => {
      stopAllMusic();
    };
  }, []);

  useEffect(() => {
    if (!musicOn || !session) {
      stopAllMusic();
      return;
    }

    if (session.status === "lobby") {
      void startLobbyMusic();
      return;
    }

    if (session.status === "question") {
      stopLobbyMusic();
      return;
    }

    stopAllMusic();
  }, [musicOn, session?.status, session?.id]);

  useEffect(() => {
    if (!session || session.status !== "ended" || leaderboard.length === 0) return;

    const winner = leaderboard[0];
    const announceKey = `${session.id}-${winner.id}-${winner.score}`;
    if (winnerAnnouncedRef.current === announceKey) return;

    winnerAnnouncedRef.current = announceKey;
    stopAllMusic();
    void playSound("end");
    window.setTimeout(() => {
      void announceWinnerWithGemini(winner.name);
    }, 850);
  }, [leaderboard, session?.id, session?.status]);

  useEffect(() => {
    if (!session || session.status !== "question" || !session.question_started_at) {
      autoActionRef.current = "";
      setTimeLeft(session?.question_duration ?? timerSeconds);
      return;
    }

    const updateRemaining = () => {
      const startedAt = new Date(session.question_started_at ?? Date.now()).getTime();
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const nextTimeLeft = Math.max(0, session.question_duration - elapsed);
      setTimeLeft(nextTimeLeft);

      if (nextTimeLeft <= 3 && nextTimeLeft > 0) {
        void playSound("tick");
      }

      const countdownKey = `${session.id}-${session.current_question}-${session.question_started_at}`;
      if (musicOn && nextTimeLeft > 0 && countdownSoundRef.current !== countdownKey) {
        countdownSoundRef.current = countdownKey;
        void playCountdownMusic(session.current_question, countdownKey);
      }

      const actionKey = `${session.id}-${session.current_question}-${session.question_started_at}`;
      if (autoNext && nextTimeLeft <= 0 && autoActionRef.current !== actionKey) {
        autoActionRef.current = actionKey;
        stopCountdownMusic();
        void playSound("results");
        void setStatus("results", session.current_question);
        window.setTimeout(() => {
          if (session.current_question >= questions.length - 1) {
            void setStatus("ended", session.current_question);
          } else {
            void askQuestion(session.current_question + 1);
          }
        }, session.results_duration * 1000);
      }
    };

    updateRemaining();
    const intervalId = window.setInterval(updateRemaining, 1000);
    return () => window.clearInterval(intervalId);
  }, [
    autoNext,
    questions.length,
    session?.id,
    session?.status,
    session?.current_question,
    session?.question_started_at,
    session?.question_duration,
    session?.results_duration,
    musicOn,
  ]);

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

  async function importQuestionsCsv(file: File | null) {
    if (!file) return;

    try {
      const csvText = await file.text();
      const importedQuestions = parseQuestionsCsv(csvText);
      setQuestions(importedQuestions);
      setQuestionLimit(importedQuestions.length);
      setError("");
    } catch (err) {
      setError(getErrorMessage(err, "นำเข้า CSV ไม่สำเร็จ"));
    }
  }

  async function uploadQuestionImage(questionIndex: number, file: File | null) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("กรุณาเลือกไฟล์รูปภาพเท่านั้น");
      return;
    }

    if (file.size > 700_000) {
      setError("รูปภาพใหญ่เกินไป กรุณาใช้รูปไม่เกิน 700KB เพื่อให้เล่นบนมือถือได้ลื่น");
      return;
    }

    const imageUrl = await readFileAsDataUrl(file);
    updateQuestion(questionIndex, { imageUrl });
    setError("");
  }

  async function createSession() {
    setError("");
    if (!hasSupabaseConfig) {
      setError("กรุณาตั้งค่า Supabase environment variables ก่อนสร้างห้องเล่นสด");
      return;
    }

    const validQuestions = questions
      .filter((question) => question.prompt.trim() && question.choices.every((choice) => choice.text.trim()))
      .slice(0, questionLimit);
    if (!title.trim() || validQuestions.length === 0) {
      setError("กรุณาใส่ชื่อควิซและเลือกคำถามที่สมบูรณ์อย่างน้อย 1 ข้อ");
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
          question_duration: timerSeconds,
          results_duration: resultsSeconds,
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      setQuiz(quizData as Quiz);
      setQuestions((quizData as Quiz).questions);
      setSession(sessionData as GameSession);
    } catch (err) {
      setError(getErrorMessage(err, "สร้างห้องเล่นสดไม่สำเร็จ"));
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
        .update({
          status,
          current_question: currentQuestion,
          question_started_at: status === "question" ? new Date().toISOString() : session.question_started_at,
          question_duration: timerSeconds,
          results_duration: resultsSeconds,
        })
        .eq("id", session.id)
        .select()
        .single();
      if (sessionError) throw sessionError;
      setSession(data as GameSession);
    } catch (err) {
      setError(getErrorMessage(err, "อัปเดตสถานะเกมไม่สำเร็จ"));
    } finally {
      setBusy(false);
    }
  }

  async function copyJoinLink() {
    if (!session) return;
    await navigator.clipboard.writeText(`${window.location.origin}/join?code=${session.room_code}`);
  }

  async function askQuestion(questionIndex = session?.current_question ?? 0) {
    await playSound("question");
    await setStatus("question", questionIndex);
  }

  async function toggleMusic() {
    if (musicOn) {
      stopAllMusic();
      setMusicOn(false);
      return;
    }

    setMusicOn(true);
    if (session?.status === "lobby") {
      await startLobbyMusic();
    }
  }

  return (
    <main className="thai-bg soft-grid min-h-screen px-4 py-5 text-ink sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="thai-header relative overflow-hidden rounded-2xl p-5 text-white sm:p-7">
          <div className="absolute -right-8 -top-10 h-40 w-40 rounded-full bg-yellow-300/35 blur-2xl" />
          <div className="absolute -bottom-12 left-1/3 h-36 w-36 rounded-full bg-cyan-200/30 blur-2xl" />
          <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Link href="/" className="inline-flex items-center gap-2 rounded-full bg-white/16 px-3 py-2 text-sm font-bold text-white hover:bg-white/24">
                <ArrowLeft size={18} />
                หน้าแรก
              </Link>
              <div className="mt-5 inline-flex rounded-full bg-white/18 px-4 py-2 text-sm font-black tracking-wide">
                เวทีควิซ AI สำหรับ Seminar
              </div>
              <h1 className="mt-3 text-4xl font-black leading-tight sm:text-6xl">LIVE QUIZ CHALANGE</h1>
              <p className="mt-2 max-w-2xl text-base font-bold text-white/82">
                เปิดห้อง แจกโค้ด เล่นเพลง จับเวลา และดูคะแนนผู้เรียนแบบเรียลไทม์
              </p>
            </div>
            {session ? (
              <div className="rounded-2xl border border-white/25 bg-white/18 p-4 text-white shadow-panel backdrop-blur">
                <p className="text-xs font-black uppercase tracking-widest text-white/65">รหัสเข้าห้อง</p>
                <p className="mt-1 text-4xl font-black tracking-widest">{session.room_code}</p>
              </div>
            ) : (
              <div className="hidden rounded-2xl border border-white/25 bg-white/14 p-4 text-center font-black backdrop-blur sm:block">
                <img src="/images/funny-ai-quiz-logo.png" alt="Funny AI Quiz logo" className="mx-auto h-28 w-28 rounded-2xl object-cover shadow-panel" />
                <p className="mt-2">พร้อมเริ่มกิจกรรม</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6">
          <SetupWarning />
        </div>
        {error ? <div className="mb-5 rounded-md border-2 border-coral bg-white p-4 font-bold text-coral">{error}</div> : null}

        {!session ? (
          <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="thai-panel rounded-2xl p-5">
              <label className="text-sm font-black">ชื่อควิซ</label>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="mt-2 h-12 w-full rounded-md border-2 border-ink/15 px-3 font-bold outline-none focus:border-ink"
              />
              <button
                onClick={createSession}
                disabled={busy}
                className="thai-button mt-5 inline-flex h-12 w-full items-center justify-center gap-2 bg-[#4c1d95] px-4 font-black text-white"
              >
                <Radio size={19} />
                สร้างห้องเล่นสด
              </button>
              <div className="mt-5 grid grid-cols-3 gap-3">
                <label className="text-sm font-black">
                  จำนวนข้อ
                  <input
                    type="number"
                    min={1}
                    max={questions.length}
                    value={questionLimit}
                    onChange={(event) => {
                      const nextLimit = Number(event.target.value);
                      setQuestionLimit(Math.max(1, Math.min(questions.length, nextLimit)));
                    }}
                    className="mt-2 h-11 w-full rounded-xl border-2 border-[#7c3aed]/15 bg-white px-3 outline-none focus:border-[#7c3aed]"
                  />
                </label>
                <label className="text-sm font-black">
                  วินาทีต่อข้อ
                  <input
                    type="number"
                    min={5}
                    max={120}
                    value={timerSeconds}
                    onChange={(event) => setTimerSeconds(Number(event.target.value))}
                    className="mt-2 h-11 w-full rounded-xl border-2 border-[#7c3aed]/15 bg-white px-3 outline-none focus:border-[#7c3aed]"
                  />
                </label>
                <label className="text-sm font-black">
                  เวลาโชว์ผล
                  <input
                    type="number"
                    min={3}
                    max={30}
                    value={resultsSeconds}
                    onChange={(event) => setResultsSeconds(Number(event.target.value))}
                    className="mt-2 h-11 w-full rounded-xl border-2 border-[#7c3aed]/15 bg-white px-3 outline-none focus:border-[#7c3aed]"
                  />
                </label>
              </div>
              <label className="mt-4 flex items-center gap-3 font-black">
                <input
                  type="checkbox"
                  checked={autoNext}
                  onChange={(event) => setAutoNext(event.target.checked)}
                  className="h-5 w-5 accent-ink"
                />
                ไปข้อถัดไปอัตโนมัติ
              </label>
              <p className="mt-3 rounded-xl bg-[#ede9fe] px-3 py-2 text-sm font-bold text-[#6d28d9]">
                ตอนสร้างห้อง ระบบจะใช้คำถาม {questionLimit} ข้อแรก และใช้เวลา {timerSeconds} วินาทีเท่ากันทุกข้อ
              </p>
              <div className="mt-4 rounded-2xl border border-[#7c3aed]/10 bg-white/75 p-4">
                <p className="font-black text-[#4c1d95]">นำเข้าคำถามจาก CSV</p>
                <p className="mt-1 text-sm font-bold text-ink/60">
                  รูปแบบ: Question, Answer 1, Answer 2, Answer 3, Answer 4, Correct answer และ Image URL (ถ้ามี)
                </p>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(event) => void importQuestionsCsv(event.target.files?.[0] ?? null)}
                  className="mt-3 block w-full text-sm font-bold file:mr-4 file:rounded-xl file:border-0 file:bg-[#4c1d95] file:px-4 file:py-2 file:font-black file:text-white"
                />
              </div>
            </div>

            <div className="grid gap-4">
              {questions.map((question, questionIndex) => (
                <div key={questionIndex} className="thai-panel rounded-2xl p-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-black">คำถามที่ {questionIndex + 1}</p>
                    <button
                      aria-label="ลบคำถาม"
                      onClick={() =>
                        setQuestions((items) => {
                          const nextItems = items.filter((_, index) => index !== questionIndex);
                          setQuestionLimit((limit) => Math.max(1, Math.min(limit, nextItems.length)));
                          return nextItems;
                        })
                      }
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
                  <div className="mt-3 rounded-2xl border border-[#7c3aed]/10 bg-white/70 p-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-black text-[#4c1d95]">รูปประกอบคำถาม</p>
                        <p className="text-xs font-bold text-ink/55">รองรับ JPG/PNG/WebP ขนาดไม่เกิน 700KB</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <label className="thai-button cursor-pointer rounded-xl bg-[#4c1d95] px-4 py-2 text-sm font-black text-white">
                          อัปโหลดรูป
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(event) => void uploadQuestionImage(questionIndex, event.target.files?.[0] ?? null)}
                            className="hidden"
                          />
                        </label>
                        {question.imageUrl ? (
                          <button
                            onClick={() => updateQuestion(questionIndex, { imageUrl: undefined })}
                            className="thai-button rounded-xl border-2 border-coral bg-white px-4 py-2 text-sm font-black text-coral"
                          >
                            ลบรูป
                          </button>
                        ) : null}
                      </div>
                    </div>
                    {question.imageUrl ? (
                      <img
                        src={question.imageUrl}
                        alt={`รูปประกอบคำถามที่ ${questionIndex + 1}`}
                        className="mt-3 max-h-56 w-full rounded-xl object-contain"
                      />
                    ) : null}
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {question.choices.map((choice, choiceIndex) => (
                      <div key={choiceIndex} className="flex gap-2">
                        <button
                          title="ตั้งเป็นคำตอบที่ถูกต้อง"
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
                onClick={() =>
                  setQuestions((items) => {
                    const nextItems = [...items, emptyQuestion()];
                    setQuestionLimit(nextItems.length);
                    return nextItems;
                  })
                }
                className="thai-button inline-flex h-12 items-center justify-center gap-2 border-2 border-[#4c1d95] bg-white font-black text-[#4c1d95]"
              >
                <Plus size={19} />
                เพิ่มคำถาม
              </button>
            </div>
          </section>
        ) : (
          <section className="grid gap-5 lg:grid-cols-[0.75fr_1.25fr]">
            <aside className="thai-panel rounded-2xl p-5">
              <div className="grid grid-cols-2 gap-3">
                <button onClick={copyJoinLink} className="thai-button inline-flex h-12 items-center justify-center gap-2 bg-[#4c1d95] font-black text-white">
                  <Copy size={18} />
                  คัดลอกลิงก์
                </button>
                <button
                  onClick={() => askQuestion()}
                  disabled={busy || session.status === "question"}
                  className="thai-button inline-flex h-12 items-center justify-center gap-2 bg-[#34d399] font-black text-ink"
                >
                  <Radio size={18} />
                  เริ่มข้อ
                </button>
                <button
                  onClick={() => setStatus("results")}
                  disabled={busy || session.status === "results"}
                  className="thai-button inline-flex h-12 items-center justify-center gap-2 bg-[#facc15] font-black text-ink"
                >
                  <Eye size={18} />
                  เฉลย
                </button>
                <button
                  onClick={() => setStatus("lobby")}
                  disabled={busy}
                  className="thai-button inline-flex h-12 items-center justify-center gap-2 border-2 border-[#4c1d95] bg-white font-black text-[#4c1d95]"
                >
                  <RotateCcw size={18} />
                  ห้องรอ
                </button>
                <button
                  onClick={toggleMusic}
                  className="thai-button inline-flex h-12 items-center justify-center gap-2 border-2 border-[#ec4899] bg-white font-black text-[#be185d]"
                >
                  {musicOn ? <VolumeX size={18} /> : <Volume2 size={18} />}
                  เพลง
                </button>
              </div>
              <div className="mt-4 rounded-2xl border border-[#7c3aed]/10 bg-gradient-to-br from-white to-[#f5f3ff] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 font-black">
                    <Timer size={18} />
                    เวลา
                  </div>
                  <span className="text-3xl font-black">{session.status === "question" ? timeLeft : session.question_duration}s</span>
                </div>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-[#ede9fe]">
                  <div className="h-full bg-gradient-to-r from-[#fb7185] via-[#facc15] to-[#34d399] transition-all" style={{ width: `${timerProgress}%` }} />
                </div>
                <label className="mt-4 flex items-center gap-3 text-sm font-black">
                  <input
                    type="checkbox"
                    checked={autoNext}
                    onChange={(event) => setAutoNext(event.target.checked)}
                    className="h-5 w-5 accent-ink"
                  />
                  เฉลยและไปข้อต่อไปอัตโนมัติ
                </label>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-2xl bg-[#4c1d95] p-3 text-white">
                  <p className="text-2xl font-black">{players.length}</p>
                  <p className="text-xs font-bold text-white/55">เข้าร่วม</p>
                </div>
                <div className="rounded-2xl bg-[#0f766e] p-3 text-white">
                  <p className="text-2xl font-black">{uniqueAnswered}</p>
                  <p className="text-xs font-bold text-white/55">ตอบแล้ว</p>
                </div>
                <div className="rounded-2xl bg-[#be185d] p-3 text-white">
                  <p className="text-2xl font-black">{correctCount}</p>
                  <p className="text-xs font-bold text-white/55">ถูก</p>
                </div>
              </div>
              <div className="mt-5">
                <p className="font-black">ผู้เล่น</p>
                <div className="mt-2 max-h-64 overflow-auto rounded-2xl border border-[#7c3aed]/10 bg-white/75">
                  {players.length ? (
                    players.map((player) => <div key={player.id} className="border-b border-ink/10 px-3 py-2 font-bold">{player.name}</div>)
                  ) : (
                    <p className="px-3 py-4 text-sm font-bold text-ink/50">กำลังรอผู้เล่น...</p>
                  )}
                </div>
              </div>
              <div className="mt-5">
                <div className="flex items-center gap-2 font-black text-[#4c1d95]">
                  <Trophy size={18} />
                  ตารางคะแนน
                </div>
                <div className="mt-2 max-h-80 overflow-auto rounded-2xl border border-[#7c3aed]/10 bg-white/80">
                  {leaderboard.length ? (
                    leaderboard.map((player, index) => (
                      <div key={player.id} className="flex items-center justify-between gap-3 border-b border-[#7c3aed]/10 px-3 py-3 last:border-b-0">
                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-black ${
                              index === 0
                                ? "bg-yellow-300 text-[#713f12]"
                                : index === 1
                                  ? "bg-slate-200 text-slate-700"
                                  : index === 2
                                    ? "bg-orange-300 text-[#7c2d12]"
                                    : "bg-[#ede9fe] text-[#6d28d9]"
                            }`}
                          >
                            {index + 1}
                          </span>
                          <span className="truncate font-black">{player.name}</span>
                        </div>
                        <span className="rounded-full bg-[#4c1d95] px-3 py-1 text-sm font-black text-white">{player.score}</span>
                      </div>
                    ))
                  ) : (
                    <p className="px-3 py-4 text-sm font-bold text-ink/50">ยังไม่มีคะแนน</p>
                  )}
                </div>
              </div>
            </aside>

            {session.status === "ended" ? (
              <div className="grid gap-5">
                <WinnerPodium
                  leaderboard={leaderboard.slice(0, 3)}
                  totalQuestions={questions.length}
                  onAnnounce={() => void announceWinnerWithGemini(leaderboard[0]?.name)}
                />
                <ScoreSummary players={leaderboard} answers={answers} questions={questions} session={session} />
              </div>
            ) : (
            <div className="thai-panel rounded-2xl p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="inline-flex rounded-full bg-[#ede9fe] px-3 py-1 text-sm font-black text-[#6d28d9]">
                    {quiz?.title} · คำถามที่ {session.current_question + 1} จาก {questions.length}
                  </p>
                  <h2 className="mt-4 text-3xl font-black leading-tight sm:text-4xl">{currentQuestion?.prompt}</h2>
                  {currentQuestion?.imageUrl ? (
                    <img
                      src={currentQuestion.imageUrl}
                      alt="รูปประกอบคำถาม"
                      className="mt-4 max-h-[360px] w-full rounded-2xl object-contain shadow-panel"
                    />
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={busy || session.current_question === 0}
                    onClick={() => askQuestion(session.current_question - 1)}
                    className="thai-button h-11 border-2 border-[#4c1d95] bg-white px-4 font-black text-[#4c1d95]"
                  >
                    ก่อนหน้า
                  </button>
                  <button
                    disabled={busy || session.current_question >= questions.length - 1}
                    onClick={() => askQuestion(session.current_question + 1)}
                    className="thai-button h-11 bg-[#4c1d95] px-4 font-black text-white"
                  >
                    ถัดไป
                  </button>
                </div>
              </div>
              <div className="mt-6 grid gap-3">
                {currentQuestion?.choices.map((choice, index) => {
                  const total = Math.max(1, currentAnswers.length);
                  const percentage = Math.round((counts[index] / total) * 100);
                  return (
                    <div key={index} className="answer-card overflow-hidden border border-white bg-white">
                      <div className={`${swatches[index]} flex items-center justify-between gap-4 px-5 py-4 font-black text-white`}>
                        <span className="leading-7">{choice.text}</span>
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/24">{counts[index] ?? 0}</span>
                      </div>
                      <div className="h-3 bg-[#ede9fe]">
                        <div className="h-full bg-[#4c1d95] transition-all" style={{ width: `${percentage}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <LiveLeaderboard leaderboard={leaderboard} totalQuestions={questions.length} />
              <button
                onClick={() => setStatus("ended")}
                className="thai-button mt-6 h-11 border-2 border-coral bg-white px-4 font-black text-coral"
              >
                จบเกม
              </button>
            </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("อ่านไฟล์รูปภาพไม่สำเร็จ"));
    reader.readAsDataURL(file);
  });
}

function LiveLeaderboard({
  leaderboard,
  totalQuestions,
}: {
  leaderboard: Array<Player & { score: number; answeredCount: number }>;
  totalQuestions: number;
}) {
  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-[#7c3aed]/12 bg-white/90 shadow-panel">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-[#4c1d95] to-[#ec4899] px-5 py-4 text-white">
        <div className="flex items-center gap-2 font-black">
          <Trophy size={22} />
          ตารางคะแนนสด
        </div>
        <p className="text-sm font-bold text-white/80">ตอบถูกเร็วได้สูงสุด 1,000 คะแนนต่อข้อ</p>
      </div>

      <div className="max-h-[360px] overflow-auto">
        {leaderboard.length ? (
          <table className="w-full border-collapse text-left">
            <thead className="sticky top-0 bg-[#f5f3ff] text-sm text-[#6d28d9]">
              <tr>
                <th className="w-20 px-4 py-3 text-center font-black">อันดับ</th>
                <th className="px-4 py-3 font-black">ผู้เล่น</th>
                <th className="px-4 py-3 text-center font-black">ตอบแล้ว</th>
                <th className="px-4 py-3 text-center font-black">คะแนน</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((player, index) => (
                <tr key={player.id} className="border-t border-[#ede9fe]">
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`mx-auto grid h-10 w-10 place-items-center rounded-full font-black ${
                        index === 0
                          ? "bg-yellow-300 text-[#713f12]"
                          : index === 1
                            ? "bg-slate-200 text-slate-700"
                            : index === 2
                              ? "bg-orange-300 text-[#7c2d12]"
                              : "bg-[#ede9fe] text-[#6d28d9]"
                      }`}
                    >
                      {index + 1}
                    </span>
                  </td>
                  <td className="max-w-0 truncate px-4 py-3 text-lg font-black">{player.name}</td>
                  <td className="px-4 py-3 text-center font-bold text-ink/65">
                    {player.answeredCount}/{totalQuestions}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex min-w-14 justify-center rounded-full bg-[#4c1d95] px-4 py-2 text-lg font-black text-white">
                      {player.score}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="px-5 py-6 text-center font-bold text-ink/55">ยังไม่มีผู้เล่นเข้าร่วม</p>
        )}
      </div>
    </div>
  );
}

function WinnerPodium({
  leaderboard,
  totalQuestions,
  onAnnounce,
}: {
  leaderboard: Array<Player & { score: number }>;
  totalQuestions: number;
  onAnnounce: () => void;
}) {
  const first = leaderboard[0];
  const second = leaderboard[1];
  const third = leaderboard[2];

  return (
    <div className="winner-bg relative min-h-[620px] overflow-hidden rounded-xl p-5 text-white shadow-panel sm:p-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(255,255,255,0.7),transparent_26%)]" />
      <div className="relative z-10 text-center">
        <p className="text-sm font-black uppercase tracking-[0.28em] text-white/85">ผลการแข่งขัน</p>
        <h2 className="mt-2 text-5xl font-black text-[#4c1d95] drop-shadow-sm sm:text-7xl">ผู้ชนะวันนี้</h2>
      </div>

      <div className="relative z-10 mx-auto mt-12 grid max-w-4xl grid-cols-3 items-end gap-3 sm:gap-5">
        <PodiumSpot player={second} place={2} height="h-44 sm:h-56" color="from-slate-300 to-slate-500" />
        <PodiumSpot player={first} place={1} height="h-60 sm:h-80" color="from-yellow-300 to-orange-500" crown />
        <PodiumSpot player={third} place={3} height="h-36 sm:h-48" color="from-orange-400 to-rose-600" />
      </div>

      <div className="relative z-10 mx-auto mt-6 max-w-xl rounded-lg bg-white/85 p-4 text-center text-ink backdrop-blur">
        <Medal className="mx-auto text-[#4c1d95]" size={30} />
        <p className="mt-2 font-black">คะแนนเต็ม {totalQuestions * 1000} คะแนน</p>
        <p className="text-sm font-bold text-ink/60">ขอบคุณทุกคนที่ร่วมเล่นควิซ</p>
        <button
          onClick={onAnnounce}
          className="thai-button mt-4 rounded-xl bg-[#4c1d95] px-5 py-3 font-black text-white"
        >
          ประกาศผู้ชนะอีกครั้ง
        </button>
      </div>
    </div>
  );
}

function ScoreSummary({
  players,
  answers,
  questions,
  session,
}: {
  players: Array<Player & { score: number; answeredCount: number }>;
  answers: Answer[];
  questions: Question[];
  session: GameSession | null;
}) {
  return (
    <div className="thai-panel overflow-hidden rounded-2xl">
      <div className="bg-gradient-to-r from-[#0f766e] to-[#4c1d95] px-5 py-4 text-white">
        <h3 className="text-2xl font-black">สรุปคะแนนรายข้อ</h3>
        <p className="text-sm font-bold text-white/75">ตอบถูกเร็วได้ 500-1,000 คะแนน, ผิดหรือไม่ตอบได้ 0</p>
      </div>
      <div className="overflow-auto">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead className="bg-[#f5f3ff] text-sm text-[#6d28d9]">
            <tr>
              <th className="sticky left-0 z-10 bg-[#f5f3ff] px-4 py-3 font-black">ผู้เล่น</th>
              {questions.map((_, index) => (
                <th key={index} className="px-3 py-3 text-center font-black">ข้อ {index + 1}</th>
              ))}
              <th className="px-4 py-3 text-center font-black">รวม</th>
            </tr>
          </thead>
          <tbody>
            {players.length ? (
              players.map((player) => (
                <tr key={player.id} className="border-t border-[#ede9fe]">
                  <td className="sticky left-0 z-10 max-w-48 truncate bg-white px-4 py-3 font-black">{player.name}</td>
                  {questions.map((question, questionIndex) => {
                    const answer = answers.find((item) => item.player_id === player.id && item.question_index === questionIndex);
                    const answerScore = calculateAnswerScore(answer, question, session);
                    return (
                      <td key={questionIndex} className="px-3 py-3 text-center">
                        <span
                          className={`inline-flex min-w-12 justify-center rounded-full px-3 py-2 text-sm font-black ${
                            !answer
                              ? "bg-slate-100 text-slate-400"
                              : answerScore > 0
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-rose-100 text-rose-700"
                          }`}
                        >
                          {!answer ? "-" : answerScore > 0 ? answerScore : "✕"}
                        </span>
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex min-w-14 justify-center rounded-full bg-[#4c1d95] px-4 py-2 font-black text-white">
                      {player.score}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={questions.length + 2} className="px-5 py-6 text-center font-bold text-ink/55">
                  ยังไม่มีผู้เล่น
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PodiumSpot({
  player,
  place,
  height,
  color,
  crown = false,
}: {
  player?: Player & { score: number };
  place: number;
  height: string;
  color: string;
  crown?: boolean;
}) {
  const face = place === 1 ? "🤩" : place === 2 ? "😊" : "😎";

  return (
    <div className="flex flex-col items-center">
      <div className="mb-2 grid h-20 w-20 place-items-center rounded-full bg-white text-4xl shadow-panel sm:h-24 sm:w-24">
        {face}
      </div>
      {crown ? <Crown className="-mt-28 mb-20 text-yellow-300 drop-shadow" size={42} /> : null}
      <div className={`${height} flex w-full flex-col items-center justify-start rounded-t-xl bg-gradient-to-b ${color} px-2 pt-5 shadow-2xl`}>
        <div className="grid h-14 w-14 place-items-center rounded-md bg-white/90 text-3xl font-black text-[#4c1d95] shadow">
          {place}
        </div>
        <p className="mt-4 max-w-full truncate text-center text-xl font-black sm:text-2xl">{player?.name ?? "-"}</p>
        <p className="text-sm font-black text-white/85">{player ? `${player.score} คะแนน` : "รอผล"}</p>
      </div>
    </div>
  );
}
