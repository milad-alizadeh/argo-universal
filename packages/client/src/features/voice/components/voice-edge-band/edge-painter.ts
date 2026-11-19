import { silentSpectrum } from '../../types/voice-connection';
import { edgeBars, edgeFade, EdgeHistory, type EdgeLook } from './edge-band';
import type { EdgeWaveProps } from './edge-wave-props';

// Paper's band: 2-point bars every 4 points with round ends, the first centred 3 points in, in a 14-point row.
const pitch = 4;

const firstBar = 3;

export const rowHeight = 14;

const fullBar = 12;

const barWidth = 2;

// A silent bar is a dot: its round ends meet.
const dotLength = 0.1;

// A muted microphone's line draws at 60% of the others' strength.
const dimmed = 0.6;

// LiveWaveform's scrolling mode pushes a new bar at most every 30ms; the band's slower pace keeps it calm.
const pushEvery = 0.06;

// The bands' average sits low for speech; this lifts it to fill the band, as LiveWaveform's sensitivity does.
const sensitivity = 2;

const colourEvery = 30;

const silence = silentSpectrum();

const silent = (): typeof silence => silence;

export const toneClasses: Record<EdgeLook['tone'], string> = {
  tertiary: 'text-tertiary',
  foreground: 'text-foreground',
  info: 'text-info',
  'muted-foreground': 'text-muted-foreground',
  danger: 'text-danger',
  warning: 'text-warning',
};

const barsAcross = (width: number): number =>
  Math.max(0, Math.floor((width - firstBar) / pitch) + 1);

const average = (bands: Float32Array): number =>
  bands.reduce((sum, band) => sum + band, 0) / Math.max(1, bands.length);

// Clears the row and sets the bars' stroke, in points, sharp at the screen's pixel ratio.
function prepare(
  context: CanvasRenderingContext2D,
  width: number,
  colour: string,
): void {
  const ratio = window.devicePixelRatio;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, rowHeight);
  context.strokeStyle = colour;
  context.lineWidth = barWidth;
  context.lineCap = 'round';
}

// The bars, read from the latest props each frame; nothing here renders React again.
export class EdgePainter {
  private history = new EdgeHistory(0);
  private clock = 0;
  private sincePush = 0;
  private frames = 0;
  private colour = '';
  private tone = '';

  public constructor(private readonly canvas: HTMLCanvasElement) {}

  public paint(props: EdgeWaveProps, seconds: number): void {
    const context = this.canvas.getContext('2d');
    const width = this.canvas.clientWidth;

    if (!context) return;

    this.advance(props, seconds, barsAcross(width));
    this.readColour(props.look.tone);
    this.draw(context, props.look, width);
  }

  private advance(props: EdgeWaveProps, seconds: number, count: number): void {
    this.clock += seconds;
    this.sincePush += seconds;

    if (this.history.bars.length !== count) this.resize(count);

    if (this.sincePush < pushEvery) return;

    this.sincePush = 0;
    this.history.push(this.levelOf(props));
  }

  private levelOf({ look, spectrum }: EdgeWaveProps): number {
    if (!look.follows) return 0;

    return average((spectrum ?? silent)()[look.follows]) * sensitivity;
  }

  // A new width keeps the newest bars, at the right.
  private resize(count: number): void {
    const kept = this.history.bars.slice(-count);
    this.history = new EdgeHistory(count);
    this.history.bars.set(kept, count - kept.length);
  }

  private readColour(tone: string): void {
    this.frames += 1;

    if (tone === this.tone && this.frames % colourEvery !== 0) return;

    this.tone = tone;
    this.colour = getComputedStyle(this.canvas).color;
  }

  private barsFor(look: EdgeLook): Float32Array {
    if (look.motion === 'history') return this.history.bars;

    const bars = new Float32Array(this.history.bars.length);
    edgeBars(bars, look.motion, this.clock);

    return bars;
  }

  private draw(
    context: CanvasRenderingContext2D,
    look: EdgeLook,
    width: number,
  ): void {
    prepare(context, width, this.colour);
    const bars = this.barsFor(look);
    const strength = look.dim ? dimmed : 1;

    for (const [index, value] of bars.entries()) {
      context.globalAlpha = edgeFade(index, bars.length) * strength;
      bar(context, index, value);
    }
  }
}

function bar(
  context: CanvasRenderingContext2D,
  index: number,
  value: number,
): void {
  const length = Math.max(dotLength, value * fullBar);
  const x = firstBar + index * pitch;
  context.beginPath();
  context.moveTo(x, (rowHeight - length) / 2);
  context.lineTo(x, (rowHeight + length) / 2);
  context.stroke();
}
