import { describe, expect, it } from 'vitest';
import { OrbMotion } from './orb-motion';

const quiet = { input: 0, output: 0 };

// Runs the motion for a while at 60 frames a second, as the screen would.
function settle(
  motion: OrbMotion,
  state: Parameters<OrbMotion['step']>[0],
  levels: { input: number; output: number },
): ReturnType<OrbMotion['step']> {
  let drawn = motion.step(state, levels, 1 / 60);

  for (let frame = 0; frame < 120; frame += 1)
    drawn = motion.step(state, levels, 1 / 60);

  return drawn;
}

describe('the orb motion', () => {
  it('rests with no input and a low voice when the call has no sound to show', () => {
    const drawn = settle(new OrbMotion(), 'none', quiet);

    expect(drawn.input).toBeCloseTo(0, 1);
    expect(drawn.output).toBeCloseTo(0.3, 1);
  });

  it('moves more while the voice talks aloud than while it listens', () => {
    const listening = settle(new OrbMotion(), 'listening', quiet);
    const aloud = { input: 0, output: 0.8 };
    const talking = settle(new OrbMotion(), 'talking', aloud);

    expect(talking.output).toBeGreaterThan(listening.output);
  });

  it('follows the microphone level while listening', () => {
    const silent = settle(new OrbMotion(), 'listening', quiet);
    const loud = settle(new OrbMotion(), 'listening', { input: 1, output: 0 });

    expect(loud.input).toBeGreaterThan(silent.input);
    expect(loud.input).toBeLessThanOrEqual(1);
  });

  it('follows the voice level while talking', () => {
    const calm = settle(new OrbMotion(), 'talking', quiet);
    const loud = settle(new OrbMotion(), 'talking', { input: 0, output: 1 });

    expect(loud.output).toBeGreaterThan(calm.output);
    expect(loud.output).toBeLessThanOrEqual(1);
  });

  it('advances its clock with each frame and fades in', () => {
    const motion = new OrbMotion();
    const first = motion.step('listening', quiet, 0.1);
    const second = motion.step('listening', quiet, 0.1);

    expect(second.time).toBeGreaterThan(first.time);
    expect(second.opacity).toBeGreaterThan(first.opacity);
    expect(settle(new OrbMotion(), 'listening', quiet).opacity).toBe(1);
  });
});
