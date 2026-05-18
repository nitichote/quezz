"use client";

let audioContext: AudioContext | null = null;

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

export async function playSound(kind: "question" | "answer" | "results" | "tick" | "end") {
  const context = getAudioContext();
  await context.resume();
  const now = context.currentTime;

  if (kind === "question") {
    [523, 659, 784, 1046].forEach((note, index) => tone(note, now + index * 0.09, 0.11, "square", 0.07));
  }

  if (kind === "answer") {
    [784, 988].forEach((note, index) => tone(note, now + index * 0.07, 0.1, "triangle", 0.06));
  }

  if (kind === "results") {
    [392, 523, 659].forEach((note, index) => tone(note, now + index * 0.12, 0.16, "sawtooth", 0.06));
  }

  if (kind === "tick") {
    tone(880, now, 0.06, "square", 0.045);
  }

  if (kind === "end") {
    [1046, 784, 523, 392].forEach((note, index) => tone(note, now + index * 0.1, 0.18, "triangle", 0.07));
  }
}

export async function startFunnyLoop() {
  const context = getAudioContext();
  await context.resume();
  let stopped = false;
  const melody = [523, 659, 784, 659, 587, 740, 880, 740];
  let step = 0;

  const playStep = () => {
    if (stopped) return;
    const now = context.currentTime;
    tone(melody[step % melody.length], now, 0.13, step % 2 ? "triangle" : "square", 0.035);
    tone(melody[(step + 2) % melody.length] / 2, now, 0.16, "sine", 0.025);
    step += 1;
  };

  playStep();
  const intervalId = window.setInterval(playStep, 230);

  return () => {
    stopped = true;
    window.clearInterval(intervalId);
  };
}
