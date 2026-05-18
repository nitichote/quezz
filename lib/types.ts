export type Choice = {
  text: string;
};

export type Question = {
  prompt: string;
  choices: Choice[];
  correctIndex: number;
};

export type Quiz = {
  id: string;
  title: string;
  questions: Question[];
  created_at?: string;
};

export type GameSession = {
  id: string;
  quiz_id: string;
  room_code: string;
  status: "lobby" | "question" | "results" | "ended";
  current_question: number;
  question_started_at?: string | null;
  question_duration: number;
  results_duration: number;
  created_at?: string;
};

export type Player = {
  id: string;
  session_id: string;
  name: string;
  joined_at?: string;
};

export type Answer = {
  id: string;
  session_id: string;
  player_id: string;
  question_index: number;
  choice_index: number;
  created_at?: string;
};
