/*
 * The waveform's bars, ported from ElevenLabs UI's LiveWaveform (`live-waveform.tsx`, its static mode and its
 * processing animation) and BarVisualizer (`bar-visualizer.tsx`, its connecting sequence).
 *
 * MIT License, Copyright (c) 2025 Eleven Labs Inc. Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software
 * without restriction, subject to the conditions that the above copyright notice and this permission notice be
 * included in all copies or substantial portions of the Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY
 * OF ANY KIND. https://github.com/elevenlabs/ui
 *
 * Argo's changes: the bars are read from the connection's speech bands rather than an analyser the component opens on
 * the microphone itself, they are written into one reused buffer, and the animations run on a clock in seconds.
 */
import type { VisualiserPattern } from './visualiser-pattern';

// What the wave shows at one moment: the pattern, the sound it draws, if any, and the clock in seconds.
export interface WaveMoment {
  pattern: VisualiserPattern;
  heard: ArrayLike<number> | undefined;
  time: number;
}

// LiveWaveform never draws a bar lower than this, so silence still shows a line of dots.
export const quietestBar = 0.05;

const clampBar = (value: number): number =>
  Math.min(1, Math.max(quietestBar, value));

// The band a bar shows: the lowest at the middle, mirrored out to the highest at both edges.
function bandAt(
  heard: ArrayLike<number>,
  fromMiddle: number,
  half: number,
): number {
  return heard[Math.floor((fromMiddle / half) * heard.length)] ?? 0;
}

/*
 * LiveWaveform multiplies each bar by its `sensitivity`; speech seldom fills a band, so the wave lifts it this much to
 * read clearly at the stage's size.
 */
const sensitivity = 1.8;

function speech(bars: Float32Array, heard: ArrayLike<number>): void {
  const half = Math.floor(bars.length / 2);

  for (let fromMiddle = 0; fromMiddle < half; fromMiddle++) {
    const value = clampBar(bandAt(heard, fromMiddle, half) * sensitivity);
    bars[half - 1 - fromMiddle] = value;
    bars[half + fromMiddle] = value;
  }
}

// LiveWaveform's processing clock advances 0.03 a frame, at 60 frames a second.
const processingRate = 1.8;

// Three slow waves summed, weighted to the middle: LiveWaveform's processing animation.
const processingWaves = [
  { amplitude: 0.25, speed: 1.5, spread: 3, oscillator: Math.sin },
  { amplitude: 0.2, speed: 0.8, spread: -2, oscillator: Math.sin },
  { amplitude: 0.15, speed: 2, spread: 1, oscillator: Math.cos },
] as const;

const processingBase = 0.2;

// How much quieter the edges are than the middle.
const edgeQuieting = 0.4;

function processingBar(position: number, clock: number): number {
  const summed = processingWaves.reduce(
    (sum, { amplitude, speed, spread, oscillator }) =>
      sum + oscillator(clock * speed + position * spread) * amplitude,
    processingBase,
  );

  return clampBar(summed * (1 - Math.abs(position) * edgeQuieting));
}

function processing(bars: Float32Array, time: number): void {
  const half = Math.floor(bars.length / 2);
  const clock = time * processingRate;

  for (let bar = 0; bar < bars.length; bar++)
    bars[bar] = processingBar((bar - half) / half, clock);
}

// BarVisualizer's connecting sequence takes two seconds to sweep its pair of bars across.
const sweepSeconds = 2;

// How high the swept pair stands, where BarVisualizer colours its pair instead.
const sweptBar = 0.35;

function connecting(bars: Float32Array, time: number): void {
  const count = bars.length;
  const step = Math.floor((time * count) / sweepSeconds) % count;
  bars.fill(quietestBar);
  bars[step] = sweptBar;
  bars[count - 1 - step] = sweptBar;
}

const silence = new Float32Array(1);

const drawings: Record<
  VisualiserPattern,
  (bars: Float32Array, moment: WaveMoment) => void
> = {
  connecting: (bars, { time }) => connecting(bars, time),
  thinking: (bars, { time }) => processing(bars, time),
  listening: (bars, { heard }) => speech(bars, heard ?? silence),
  talking: (bars, { heard }) => speech(bars, heard ?? silence),
};

/*
 * Fills the bars, each from the quietest to 1, with what a pattern shows at this moment: the sound's bands mirrored
 * out from the middle while someone speaks, LiveWaveform's rolling processing wave while thinking, and BarVisualizer's
 * sweeping pair while connecting.
 */
export function waveBars(bars: Float32Array, moment: WaveMoment): void {
  drawings[moment.pattern](bars, moment);
}
