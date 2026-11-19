/*
 * The Composer's edge band, Paper's "Composer waveform — B · Edge band": a slim live waveform along the top of the
 * Composer card. Its scrolling history is ElevenLabs UI's LiveWaveform in its scrolling mode (`live-waveform.tsx`,
 * MIT, Copyright (c) 2025 Eleven Labs Inc., https://github.com/elevenlabs/ui): each update pushes the latest level in
 * at the right and the older ones move left. The sweep is BarVisualizer's connecting sequence drawn as one hump.
 */
import type { VoiceCall } from '@repo/contracts';
import { voiceLabel } from '../voice-stage/voice-label';

// What the band needs of the call: its state, its trouble and whether the person's microphone is muted.
export type EdgeCall = Pick<VoiceCall, 'orb' | 'trouble'> & {
  microphoneMuted: boolean;
};

// How the bars move: a hump sweeping across, the sound scrolling in, a slow low breathing, or a flat line.
export type EdgeMotion = 'sweep' | 'history' | 'breathe' | 'flat';

// The bars' colour, each one of the App's colour tokens.
export type EdgeTone =
  | 'tertiary'
  | 'foreground'
  | 'info'
  | 'muted-foreground'
  | 'danger'
  | 'warning';

export interface EdgeLook {
  motion: EdgeMotion;
  tone: EdgeTone;
  // Whose sound scrolls in: the person's microphone or the voice's output.
  follows?: 'input' | 'output';
  label: string;
  labelTone: 'neutral' | 'muted' | 'danger';
  // Whether the call's timer shows beside the label: not until the call connects.
  timer: boolean;
  // A muted microphone's line is quieter than the others.
  dim: boolean;
}

type Look = Omit<EdgeLook, 'label'>;

const base = { labelTone: 'neutral', timer: true, dim: false } as const;

const looks = {
  connecting: {
    ...base,
    motion: 'sweep',
    tone: 'tertiary',
    labelTone: 'muted',
    timer: false,
  },
  listening: {
    ...base,
    motion: 'history',
    tone: 'foreground',
    follows: 'input',
  },
  talking: { ...base, motion: 'history', tone: 'info', follows: 'output' },
  thinking: { ...base, motion: 'breathe', tone: 'muted-foreground' },
  muted: {
    ...base,
    motion: 'flat',
    tone: 'danger',
    labelTone: 'danger',
    dim: true,
  },
  reconnecting: { ...base, motion: 'sweep', tone: 'warning' },
  blocked: {
    ...base,
    motion: 'flat',
    tone: 'danger',
    labelTone: 'danger',
    dim: true,
  },
} as const satisfies Record<string, Look>;

type EdgeState = keyof typeof looks;

const orbStates = {
  none: 'connecting',
  listening: 'listening',
  talking: 'talking',
  thinking: 'thinking',
} as const satisfies Record<VoiceCall['orb'], EdgeState>;

// Trouble first, then a muted microphone, then what the call is doing.
const troubleStates = {
  reconnecting: 'reconnecting',
  'microphone-blocked': 'blocked',
} as const satisfies Record<NonNullable<VoiceCall['trouble']>, EdgeState>;

function stateOf(call: EdgeCall): EdgeState {
  if (call.trouble) return troubleStates[call.trouble];

  return call.microphoneMuted ? 'muted' : orbStates[call.orb];
}

const labelOf = (call: EdgeCall, state: EdgeState): string =>
  state === 'muted'
    ? 'Mic off'
    : voiceLabel({ ...call, startedAt: null }, 0).headline;

// What the band shows for this call: how its bars move, their colour, and the words at its right end.
export function edgeLookOf(call: EdgeCall): EdgeLook {
  const state = stateOf(call);

  return { ...looks[state], label: labelOf(call, state) };
}

// The level the newest bar shows, scrolled in from the right; the oldest falls off the left.
export class EdgeHistory {
  public readonly bars: Float32Array;

  public constructor(count: number) {
    this.bars = new Float32Array(count);
  }

  public push(level: number): void {
    this.bars.copyWithin(0, 1);
    this.bars[this.bars.length - 1] = Math.min(1, Math.max(0, level));
  }
}

const turn = Math.PI * 2;

// The sweep crosses the band in two seconds, as BarVisualizer's connecting pair does.
const sweepSeconds = 2;

// The hump is 27 bars wide and stands two thirds of a full bar at its peak.
const humpWidth = 27;

const humpPeak = 0.67;

const humpFoot = 0.17;

function sweep(bars: Float32Array, time: number): void {
  const travel = bars.length + humpWidth;
  const centre = ((time / sweepSeconds) % 1) * travel - humpWidth / 2;

  for (const [index] of bars.entries()) {
    const offset = Math.abs(index - centre) / (humpWidth / 2);
    const rise = (Math.cos(Math.min(1, offset) * Math.PI) + 1) / 2;
    bars[index] = offset < 1 ? humpFoot + (humpPeak - humpFoot) * rise : 0;
  }
}

// Breathing groups eleven bars apart, a third of a full bar at most, drifting slowly to the right.
const breathSpacing = 11;

const breathRate = 1.2;

const breathPeak = 0.32;

// How far below its middle a breath still shows, so each group is wider than its gap.
const breathFloor = 0.3;

function breathe(bars: Float32Array, time: number): void {
  for (const [index] of bars.entries()) {
    const wave = Math.sin((index / breathSpacing) * turn - time * breathRate);
    const raised = (wave + breathFloor) / (1 + breathFloor);
    bars[index] = wave > -breathFloor ? raised * breathPeak : 0;
  }
}

const motions: Record<
  Exclude<EdgeMotion, 'history'>,
  (bars: Float32Array, time: number) => void
> = {
  sweep,
  breathe,
  flat: (bars) => bars.fill(0),
};

// Fills the bars, each from 0 (a dot) to 1 (a full bar), for a motion that runs on the clock alone.
export function edgeBars(
  bars: Float32Array,
  motion: Exclude<EdgeMotion, 'history'>,
  time: number,
): void {
  motions[motion](bars, time);
}

// The band fades at both ends: its outer five bars most, the eight inside them a little.
const fades = [
  { within: 5, alpha: 0.18 },
  { within: 13, alpha: 0.45 },
] as const;

export function edgeFade(index: number, count: number): number {
  const fromEdge = Math.min(index, count - 1 - index);

  return fades.find((fade) => fromEdge < fade.within)?.alpha ?? 1;
}
