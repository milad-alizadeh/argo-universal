import type { VoiceOrbState } from '@repo/contracts';
import type { VoiceLevels } from '../../types/voice-connection';

export interface OrbDrawn {
  // Seconds of motion, which the shader's noise runs on.
  time: number;
  animation: number;
  input: number;
  output: number;
  // Fades in from 0 so the orb does not pop onto the screen.
  opacity: number;
}

const clamp = (value: number): number => Math.min(1, Math.max(0, value));

// A volume that swells and falls around a middle value; no swing holds it there.
type Wave = { base: number; swing: number; speed: number; phase: number };

const waveOf = ({ base, swing, speed, phase }: Wave, time: number): number =>
  clamp(base + swing * Math.sin(time * speed + phase));

/*
 * What each state does by itself, from ElevenLabs UI's orb: listening breathes in, talking moves in and out, thinking
 * wanders slowly, and a call with no sound to show rests.
 */
const profiles: Record<VoiceOrbState, { input: Wave; output: Wave }> = {
  none: {
    input: { base: 0, swing: 0, speed: 0, phase: 0 },
    output: { base: 0.3, swing: 0, speed: 0, phase: 0 },
  },
  listening: {
    input: { base: 0.55, swing: 0.35, speed: 3.2, phase: 0 },
    output: { base: 0.45, swing: 0, speed: 0, phase: 0 },
  },
  talking: {
    input: { base: 0.65, swing: 0.22, speed: 4.8, phase: 0 },
    output: { base: 0.75, swing: 0.22, speed: 3.6, phase: 0 },
  },
  thinking: {
    input: { base: 0.38, swing: 0.07, speed: 0.7, phase: 0 },
    output: { base: 0.48, swing: 0.12, speed: 1.05, phase: 0.6 },
  },
};

// How much of the sound the person or the voice really makes replaces the state's own motion.
const heard = 0.6;

const mix = (own: number, level: number): number =>
  own * (1 - heard) + clamp(level) * heard;

// Only the side that is speaking follows its sound: the microphone while listening, the voice while talking.
const followsMicrophone: ReadonlySet<VoiceOrbState> = new Set(['listening']);

const followsVoice: ReadonlySet<VoiceOrbState> = new Set(['talking']);

const volumeOf = (
  wave: Wave,
  time: number,
  level: number | undefined,
): number =>
  level === undefined ? waveOf(wave, time) : mix(waveOf(wave, time), level);

const ease = (current: number, target: number, rate: number): number =>
  current + (target - current) * rate;

const clockRate = 0.5;

const noiseTimeScale = 2;

const volumeEase = 0.2;

const speedEase = 0.12;

const slowest = 0.1;

const speedRange = 0.9;

const fadeSeconds = 0.5;

type Volumes = { input: number; output: number };

// The sound that moves a volume, when that side is the one speaking in this state.
const heardIn = (
  follows: ReadonlySet<VoiceOrbState>,
  state: VoiceOrbState,
  level: number,
): number | undefined => (follows.has(state) ? level : undefined);

// What the state and the sound ask each volume to be at this moment in the orb's noise time.
function volumesOf(
  state: VoiceOrbState,
  levels: VoiceLevels,
  time: number,
): Volumes {
  const { input, output } = profiles[state];

  return {
    input: volumeOf(
      input,
      time,
      heardIn(followsMicrophone, state, levels.input),
    ),
    output: volumeOf(output, time, heardIn(followsVoice, state, levels.output)),
  };
}

// The animation runs faster the louder the voice is.
const speedOf = (output: number): number =>
  slowest + (1 - (output - 1) ** 2) * speedRange;

/*
 * The orb's motion, frame by frame: the volumes it draws ease towards what the state and the sound ask for, and the
 * animation runs faster the louder the voice is. It holds the numbers only; the drawing reads them.
 */
export class OrbMotion {
  private time = 0;
  private animation = slowest;
  private speed = slowest;
  private input = 0;
  private output = 0;
  private opacity = 0;

  public step(
    state: VoiceOrbState,
    levels: VoiceLevels,
    seconds: number,
  ): OrbDrawn {
    this.advance(seconds);
    this.easeVolumes(state, levels);

    return {
      time: this.time,
      animation: this.animation,
      input: this.input,
      output: this.output,
      opacity: this.opacity,
    };
  }

  private advance(seconds: number): void {
    this.time += seconds * clockRate;
    this.opacity = Math.min(1, this.opacity + seconds / fadeSeconds);
    this.animation += seconds * this.speed;
  }

  private easeVolumes(state: VoiceOrbState, levels: VoiceLevels): void {
    const target = volumesOf(state, levels, this.time * noiseTimeScale);
    this.input = ease(this.input, target.input, volumeEase);
    this.output = ease(this.output, target.output, volumeEase);
    this.speed = ease(this.speed, speedOf(this.output), speedEase);
  }
}
