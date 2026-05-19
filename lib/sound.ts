"use client";

let audioContext: AudioContext | null = null;
let lobbyAudio: HTMLAudioElement | null = null;
let countdownAudio: HTMLAudioElement | null = null;
let activeCountdownKey = "";

const countdownTracks = ["/music/ingame10second1_2.mp3", "/music/ingame10second2_2.mp3"];

function getAudioContext() {
  audioContext ??= new AudioContext();
  return audioContext;
}

function tone(frequency: number, start: number, duration: number, type: OscillatorType, gainValue = 0.08) {
  const context = getAudioContext();
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.03);
}

async function unlockAudio() {
  const context = getAudioContext();
  await context.resume();
}

function createAudio(src: string, loop = false, volume = 0.75) {
  const audio = new Audio(src);
  audio.loop = loop;
  audio.volume = volume;
  audio.preload = "auto";
  return audio;
}

async function safePlay(audio: HTMLAudioElement) {
  try {
    await unlockAudio();
    await audio.play();
  } catch {
    // Browsers may block audio until the user clicks a control.
  }
}

export async function playSound(kind: "question" | "answer" | "results" | "tick" | "end") {
  await unlockAudio();
  const now = getAudioContext().currentTime;

  if (kind === "question") {
    [523, 659, 784, 1046].forEach((note, index) => tone(note, now + index * 0.08, 0.1, "triangle", 0.055));
  }

  if (kind === "answer") {
    [659, 784, 988].forEach((note, index) => tone(note, now + index * 0.055, 0.09, "triangle", 0.045));
  }

  if (kind === "results") {
    [784, 659, 523, 659, 784].forEach((note, index) => tone(note, now + index * 0.075, 0.11, "square", 0.035));
  }

  if (kind === "tick") {
    tone(880, now, 0.045, "triangle", 0.025);
  }

  if (kind === "end") {
    [1046, 988, 784, 659, 523].forEach((note, index) => tone(note, now + index * 0.09, 0.14, "triangle", 0.05));
  }
}

export async function startLobbyMusic() {
  stopCountdownMusic();
  lobbyAudio ??= createAudio("/music/lobbygame.mp3", true, 0.75);
  await safePlay(lobbyAudio);
}

export function stopLobbyMusic() {
  if (!lobbyAudio) return;
  lobbyAudio.pause();
  lobbyAudio.currentTime = 0;
}

export async function playCountdownMusic(questionIndex: number, countdownKey: string) {
  if (activeCountdownKey === countdownKey) return;

  stopCountdownMusic();
  stopLobbyMusic();
  activeCountdownKey = countdownKey;
  const track = countdownTracks[questionIndex % countdownTracks.length];
  countdownAudio = createAudio(track, false, 0.85);
  await safePlay(countdownAudio);
}

export function stopCountdownMusic() {
  if (!countdownAudio) return;
  countdownAudio.pause();
  countdownAudio.currentTime = 0;
  countdownAudio = null;
}

export function stopAllMusic() {
  stopLobbyMusic();
  stopCountdownMusic();
}
