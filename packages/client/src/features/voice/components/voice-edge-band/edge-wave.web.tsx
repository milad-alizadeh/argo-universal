import type * as React from 'react';
import { useEffect, useRef } from 'react';
import { EdgePainter, rowHeight, toneClasses } from './edge-painter';
import type { EdgeWaveProps } from './edge-wave-props';

const millisecondsPerSecond = 1000;

// Keeps the canvas's pixels matched to its width, sharp at the screen's pixel ratio.
function fit(canvas: HTMLCanvasElement): void {
  const ratio = window.devicePixelRatio;
  canvas.width = Math.round(canvas.clientWidth * ratio);
  canvas.height = rowHeight * ratio;
}

function useEdgeLoop(
  canvas: React.RefObject<HTMLCanvasElement | null>,
  props: EdgeWaveProps,
): void {
  const latest = useRef(props);

  useEffect(() => {
    latest.current = props;
  });

  useEffect(() => {
    const element = canvas.current;

    if (!element) return;

    return runLoop(element, () => latest.current);
  }, [canvas]);
}

// Paints a frame at a time, and keeps the canvas fitted to its width, until stopped.
class EdgeLoop {
  private readonly painter: EdgePainter;
  private readonly resizes: ResizeObserver;
  private last = performance.now();
  private frame = 0;

  public constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly read: () => EdgeWaveProps,
  ) {
    this.painter = new EdgePainter(canvas);
    this.resizes = new ResizeObserver(() => fit(canvas));
  }

  public start(): void {
    this.resizes.observe(this.canvas);
    fit(this.canvas);
    this.frame = requestAnimationFrame(this.tick);
  }

  public stop(): void {
    cancelAnimationFrame(this.frame);
    this.resizes.disconnect();
  }

  private readonly tick = (now: number): void => {
    const seconds = Math.max(0, now - this.last) / millisecondsPerSecond;
    this.painter.paint(this.read(), seconds);
    this.last = now;
    this.frame = requestAnimationFrame(this.tick);
  };
}

function runLoop(
  canvas: HTMLCanvasElement,
  read: () => EdgeWaveProps,
): () => void {
  const loop = new EdgeLoop(canvas, read);
  loop.start();

  return (): void => loop.stop();
}

// The band's waveform: a canvas across the room the label leaves, coloured by the look's token.
export function EdgeWave(props: EdgeWaveProps): React.JSX.Element {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEdgeLoop(canvas, props);

  return (
    <canvas
      ref={canvas}
      aria-hidden
      className={`block h-3.5 min-w-0 flex-1 ${toneClasses[props.look.tone]}`}
    />
  );
}
