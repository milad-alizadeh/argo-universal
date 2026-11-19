import type * as React from 'react';
import { useEffect, useRef } from 'react';
import {
  silentSpectrum,
  type VoiceSpectrum,
} from '../../types/voice-connection';
import { patternOf, type VisualiserPattern } from './visualiser-pattern';
import type { VoiceVisualiserProps } from './voice-visualiser-props';

// The token colours a drawing reads off the page: lit dots and bars, and unlit ones.
interface CanvasColours {
  on: string;
  off: string;
}

// One frame's worth of what to draw, read from the latest props.
export interface CanvasFrame {
  context: CanvasRenderingContext2D;
  colours: CanvasColours;
  pattern: VisualiserPattern;
  spectrum: VoiceSpectrum;
  // Seconds since the last frame, and since the drawing started.
  seconds: number;
  time: number;
}

// Draws one frame; it holds whatever it eases between frames.
export interface CanvasPainter {
  paint: (frame: CanvasFrame) => void;
}

const silence = silentSpectrum();

const millisecondsPerSecond = 1000;

// The colours are read off the page this often, in frames, so a theme change shows within a moment.
const colourEvery = 30;

/*
 * The canvas carries the lit colour as its own text colour and its parent carries the unlit one, both from the App's
 * tokens through class names, so a drawing follows light and dark without knowing either.
 */
function coloursOf(canvas: HTMLCanvasElement): CanvasColours {
  return {
    on: getComputedStyle(canvas).color,
    off: canvas.parentElement
      ? getComputedStyle(canvas.parentElement).color
      : '',
  };
}

// Draws a frame at a time until stopped; each frame reads the props as they are then, never through React state.
class CanvasLoop {
  private last = performance.now();
  private time = 0;
  private frame = 0;
  private drawn = 0;
  private colours: CanvasColours;

  public constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly painter: CanvasPainter,
    private readonly read: () => VoiceVisualiserProps,
  ) {
    this.colours = coloursOf(canvas);
  }

  public start(): void {
    this.frame = requestAnimationFrame(this.tick);
  }

  public stop(): void {
    cancelAnimationFrame(this.frame);
  }

  private readonly tick = (now: number): void => {
    const context = this.canvas.getContext('2d');

    if (context) this.paint(context, now);

    this.start();
  };

  private paint(context: CanvasRenderingContext2D, now: number): void {
    const seconds = this.advance(now);
    const { state, spectrum } = this.read();
    clear(context);

    this.painter.paint({
      context,
      colours: this.colours,
      pattern: patternOf(state),
      spectrum: spectrum?.() ?? silence,
      seconds,
      time: this.time,
    });
  }

  // Moves the clock on to this frame and returns the seconds since the last; rereads the colours now and then.
  private advance(now: number): number {
    const seconds = Math.max(0, now - this.last) / millisecondsPerSecond;
    this.last = now;
    this.time += seconds;
    this.drawn += 1;

    if (this.drawn % colourEvery === 0) this.colours = coloursOf(this.canvas);

    return seconds;
  }
}

// Clears the canvas and draws in points from here on, sharp at the screen's pixel ratio.
function clear(context: CanvasRenderingContext2D): void {
  const ratio = window.devicePixelRatio;
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, context.canvas.width, context.canvas.height);
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function useLatest<T>(value: T): React.RefObject<T> {
  const latest = useRef(value);

  useEffect(() => {
    latest.current = value;
  });

  return latest;
}

// A drawing runs for as long as its canvas is on the page, reading the props each frame without drawing the page again.
export function useCanvasLoop(
  canvas: React.RefObject<HTMLCanvasElement | null>,
  props: VoiceVisualiserProps,
  painter: () => CanvasPainter,
): void {
  const latest = useLatest(props);
  const made = useRef(painter);

  useEffect(() => {
    const element = canvas.current;

    if (!element) return;

    const loop = new CanvasLoop(element, made.current(), () => latest.current);
    loop.start();

    return (): void => loop.stop();
  }, [canvas, latest]);
}

// How far an eased value moves towards its target in this many seconds, for a response time of `settle` seconds.
export const easing = (seconds: number, settle: number): number =>
  1 - Math.exp(-seconds / settle);
