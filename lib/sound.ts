"use client";

let audioContext: AudioContext | null = null;
let noiseBuffer: AudioBuffer | null = null;

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

function sweep(frequency: number, endFrequency: number, start: number, duration: number, gainValue = 0.08) {
  const context = getAudioContext();
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, start);
  oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
  gain.gain.setValueAtTime(gainValue, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

function getNoiseBuffer() {
  const context = getAudioContext();
  if (noiseBuffer) return noiseBuffer;

  noiseBuffer = context.createBuffer(1, context.sampleRate * 0.2, context.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let index = 0; index < data.length; index += 1) {
    data[index] = Math.random() * 2 - 1;
  }

  return noiseBuffer;
}

function clap(start: number, gainValue = 0.045) {
  const context = getAudioContext();
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();

  source.buffer = getNoiseBuffer();
  filter.type = "highpass";
  filter.frequency.setValueAtTime(1800, start);
  gain.gain.setValueAtTime(gainValue, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.08);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(context.destination);
  source.start(start);
  source.stop(start + 0.09);
}

export async function playSound(kind: "question" | "answer" | "results" | "tick" | "end") {
  const context = getAudioContext();
  await context.resume();
  const now = context.currentTime;

  if (kind === "question") {
    [523, 659, 784, 1046].forEach((note, index) => tone(note, now + index * 0.08, 0.1, "triangle", 0.07));
    clap(now + 0.34, 0.04);
  }

  if (kind === "answer") {
    [659, 784, 988].forEach((note, index) => tone(note, now + index * 0.055, 0.09, "triangle", 0.055));
  }

  if (kind === "results") {
    [784, 659, 523, 659, 784].forEach((note, index) => tone(note, now + index * 0.075, 0.11, "square", 0.045));
    clap(now + 0.38, 0.055);
  }

  if (kind === "tick") {
    tone(880, now, 0.045, "triangle", 0.035);
  }

  if (kind === "end") {
    [1046, 988, 784, 659, 523].forEach((note, index) => tone(note, now + index * 0.09, 0.14, "triangle", 0.065));
  }
}

export async function startFunnyLoop() {
  const context = getAudioContext();
  await context.resume();
  let stopped = false;
  let bar = 0;

  const melodyBars = [
    [523, 659, 784, 988, 880, 784, 659, 784],
    [587, 740, 880, 1175, 988, 880, 740, 880],
    [659, 784, 1046, 1318, 1175, 1046, 880, 784],
    [784, 988, 1175, 1046, 880, 784, 659, 523],
  ];
  const bassBars = [
    [130, 130, 196, 196],
    [146, 146, 220, 220],
    [164, 164, 246, 246],
    [196, 185, 164, 146],
  ];

  const scheduleBar = () => {
    if (stopped) return;
    const start = context.currentTime + 0.05;
    const melody = melodyBars[bar % melodyBars.length];
    const bass = bassBars[bar % bassBars.length];

    melody.forEach((note, index) => {
      const when = start + index * 0.18;
      tone(note, when, 0.14, index % 2 ? "triangle" : "square", 0.032);
      if (index === 3 || index === 7) tone(note * 1.5, when + 0.02, 0.08, "triangle", 0.014);
    });

    bass.forEach((note, index) => {
      const when = start + index * 0.36;
      tone(note, when, 0.24, "sawtooth", 0.025);
      sweep(90, 45, when, 0.08, 0.055);
    });

    [0.18, 0.54, 0.9, 1.26].forEach((offset) => clap(start + offset, 0.026));
    bar += 1;
  };

  scheduleBar();
  const intervalId = window.setInterval(scheduleBar, 1440);

  return () => {
    stopped = true;
    window.clearInterval(intervalId);
  };
}
