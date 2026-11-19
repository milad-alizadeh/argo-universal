/*
 * ElevenLabs UI's LiveWaveform (`live-waveform.tsx`, its static mode), drawn on a canvas in the App's tokens: rounded
 * bars mirrored out from the middle that follow the call's sound, roll softly while the Agent works and sweep a pair in
 * while connecting.
 *
 * MIT License, Copyright (c) 2025 Eleven Labs Inc. Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software
 * without restriction, subject to the conditions that the above copyright notice and this permission notice be
 * included in all copies or substantial portions of the Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY
 * OF ANY KIND. https://github.com/elevenlabs/ui
 *
 * Argo's changes: the bars read the connection's speech bands instead of opening the microphone themselves, they ease
 * between frames in place of LiveWaveform's transition, and the colour comes from the App's tokens.
 */
import type * as React from 'react';
import { easing, type CanvasFrame, type CanvasPainter } from './canvas-loop';
import { VisualiserCanvas } from './visualiser-canvas';
import { heardOf } from './visualiser-pattern';
import {
  wideDrawing,
  type VoiceVisualiserProps,
} from './voice-visualiser-props';
import { quietestBar, waveBars } from './wave-bars';

// LiveWaveform's defaults: a 3-point bar, a 1-point gap, a 1.5-point corner and bars never under 4 points tall.
const barWidth = 3;

const barGap = 1;

const barRadius = 1.5;

const shortestBar = 4;

// A full bar stands 80% of the height; a bar's opacity runs from 40% when quiet to full.
const tallest = 0.8;

const faintest = 0.4;

// LiveWaveform fades 24 points at each edge.
const fadeWidth = 24;

// The analyser smooths LiveWaveform's bars; these ease towards each frame for the same feel.
const settleSeconds = 0.08;

const step = barWidth + barGap;

const { width, height } = wideDrawing;

const barCount = Math.floor(width / step);

// The bars sit centred across the drawing.
const inset = (width - (barCount * step - barGap)) / 2;

/*
 * How much of a bar the edge fade leaves, from 0 at either edge to 1 once a fade's width in: LiveWaveform clears its
 * edges with a `destination-out` gradient, which comes to the same thing for bars drawn one colour.
 */
function edgeFade(x: number): number {
  return Math.min(1, x / fadeWidth, (width - x) / fadeWidth);
}

const opacityOf = (value: number): number => faintest + value * (1 - faintest);

type Context = CanvasRenderingContext2D;

function bar(context: Context, index: number, value: number): void {
  const tall = Math.max(shortestBar, value * height * tallest);
  const x = inset + index * step;
  const top = (height - tall) / 2;
  context.globalAlpha = opacityOf(value) * edgeFade(x + barWidth / 2);
  context.beginPath();
  context.roundRect(x, top, barWidth, tall, barRadius);
  context.fill();
}

// The wave's bars, eased towards each frame the pattern asks for.
class WavePainter implements CanvasPainter {
  private readonly asked = new Float32Array(barCount);
  private readonly shown = new Float32Array(barCount).fill(quietestBar);

  public paint(frame: CanvasFrame): void {
    const { context, pattern, spectrum, time } = frame;
    waveBars(this.asked, { pattern, heard: heardOf(pattern, spectrum), time });
    this.ease(frame.seconds);
    context.fillStyle = frame.colours.on;

    for (const [index, value] of this.shown.entries())
      bar(context, index, value);

    context.globalAlpha = 1;
  }

  private ease(seconds: number): void {
    const amount = easing(seconds, settleSeconds);

    for (const [index, value] of this.shown.entries())
      this.shown[index] = value + ((this.asked[index] ?? 0) - value) * amount;
  }
}

const newPainter = (): CanvasPainter => new WavePainter();

// The live waveform, a horizontal row of bars as tall as the orb and wide.
export function VoiceWave(props: VoiceVisualiserProps): React.JSX.Element {
  return <VisualiserCanvas {...props} painter={newPainter} />;
}
