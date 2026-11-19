/*
 * ElevenLabs UI's Matrix (`matrix.tsx`), drawn on a canvas in the App's tokens: a disc of LED dots that lights the
 * call's sound band by band, turns a ring while connecting and rolls a slow wave while the Agent works.
 *
 * MIT License, Copyright (c) 2025 Eleven Labs Inc. Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software
 * without restriction, subject to the conditions that the above copyright notice and this permission notice be
 * included in all copies or substantial portions of the Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY
 * OF ANY KIND. https://github.com/elevenlabs/ui
 *
 * Argo's changes: a canvas painted each animation frame instead of SVG circles rendered by React state, the dots kept
 * to a disc so the matrix fills the orb's well, and colours from the App's tokens instead of ElevenLabs' palette.
 */
import type * as React from 'react';
import { voiceOrbSize } from '../voice-orb/voice-orb-props';
import { easing, type CanvasFrame, type CanvasPainter } from './canvas-loop';
import { drawMatrix, MatrixGrid } from './matrix-frames';
import { VisualiserCanvas } from './visualiser-canvas';
import { heardOf } from './visualiser-pattern';
import type { VoiceVisualiserProps } from './voice-visualiser-props';

// Eleven dots across the orb's 128 points: ElevenLabs' 10-point dot and 2-point gap, scaled to fit.
const dotsAcross = 11;

const pitch = voiceOrbSize / dotsAcross;

// ElevenLabs' cell is a 10-point dot beside a 2-point gap, and it draws the dot at 90% of its own radius.
const elevenLabsDot = 10;

const elevenLabsCell = 12;

const dotFill = 0.9;

const dotRadius = (pitch * elevenLabsDot * dotFill) / elevenLabsCell / 2;

// ElevenLabs' dots fade in and out over 300ms.
const settleSeconds = 0.1;

// A dot dimmer than this is off; one brighter than this glows and grows by a tenth.
const offBelow = 0.05;

const glowAbove = 0.5;

const glowGrowth = 1.1;

const glowBlur = 4;

// An unlit dot shows faintly, as ElevenLabs' do at 20% of their 0.1 opacity, raised to read on the well.
const unlitAlpha = 0.12;

const half = 0.5;

const turn = Math.PI * 2;

const radiusSquared = ((dotsAcross - 1) / 2) ** 2 + 1 / 2;

// The dots the disc keeps: those whose centre falls inside the well's circle.
const inDisc = (row: number, column: number, middle: number): boolean =>
  (row - middle) ** 2 + (column - middle) ** 2 <= radiusSquared;

type Context = CanvasRenderingContext2D;

// The middle of the cell at this row or column, in points.
const centre = (place: number): number => (place + half) * pitch;

function dot(context: Context, index: number, radius: number): void {
  const x = centre(index % dotsAcross);
  const y = centre(Math.floor(index / dotsAcross));
  context.beginPath();
  context.arc(x, y, radius, 0, turn);
  context.fill();
}

function unlit(
  context: CanvasRenderingContext2D,
  index: number,
  off: string,
): void {
  context.fillStyle = off;
  context.globalAlpha = unlitAlpha;
  context.shadowBlur = 0;
  dot(context, index, dotRadius);
}

function lit(frame: CanvasFrame, index: number, value: number): void {
  const { context, colours } = frame;
  const glows = value > glowAbove;
  context.fillStyle = colours.on;
  context.globalAlpha = value;
  context.shadowColor = colours.on;
  context.shadowBlur = glows ? glowBlur : 0;
  dot(context, index, glows ? dotRadius * glowGrowth : dotRadius);
}

// The matrix's dots, eased towards each frame the pattern asks for so they fade as ElevenLabs' do.
class MatrixPainter implements CanvasPainter {
  private readonly grid = new MatrixGrid(dotsAcross);
  private readonly shown = new Float32Array(dotsAcross * dotsAcross);

  public paint(frame: CanvasFrame): void {
    const { pattern, spectrum, time } = frame;
    drawMatrix(this.grid, { pattern, heard: heardOf(pattern, spectrum), time });
    this.ease(frame.seconds);

    for (const [index, value] of this.shown.entries())
      this.paintDot(frame, index, value);

    frame.context.globalAlpha = 1;
    frame.context.shadowBlur = 0;
  }

  private ease(seconds: number): void {
    const step = easing(seconds, settleSeconds);

    for (const [index, value] of this.shown.entries())
      this.shown[index] = value + ((this.grid.dots[index] ?? 0) - value) * step;
  }

  private paintDot(frame: CanvasFrame, index: number, value: number): void {
    const row = Math.floor(index / dotsAcross);

    if (!inDisc(row, index % dotsAcross, this.grid.middle)) return;

    if (value > offBelow) lit(frame, index, value);
    else unlit(frame.context, index, frame.colours.off);
  }
}

const newPainter = (): CanvasPainter => new MatrixPainter();

// The LED matrix in the orb's footprint.
export function VoiceMatrix(props: VoiceVisualiserProps): React.JSX.Element {
  return <VisualiserCanvas {...props} painter={newPainter} />;
}
