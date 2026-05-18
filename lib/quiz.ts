import { Question } from "@/lib/types";

export const starterQuestions: Question[] = [
  {
    prompt: "Which service will host this app?",
    choices: [
      { text: "Vercel" },
      { text: "Photoshop" },
      { text: "Excel only" },
      { text: "A USB drive" },
    ],
    correctIndex: 0,
  },
  {
    prompt: "What does Supabase provide for this project?",
    choices: [
      { text: "Database, auth, and realtime" },
      { text: "Only CSS" },
      { text: "Video editing" },
      { text: "Laptop charging" },
    ],
    correctIndex: 0,
  },
  {
    prompt: "For a seminar quiz, what should students use to join?",
    choices: [
      { text: "A room code" },
      { text: "A server password" },
      { text: "A private GitHub token" },
      { text: "The database admin key" },
    ],
    correctIndex: 0,
  },
];

export function makeRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

export function emptyQuestion(): Question {
  return {
    prompt: "",
    choices: [{ text: "" }, { text: "" }, { text: "" }, { text: "" }],
    correctIndex: 0,
  };
}
