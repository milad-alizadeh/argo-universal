import { describe, expect, it } from 'vitest';
import {
  edgeBars,
  edgeFade,
  EdgeHistory,
  edgeLookOf,
  type EdgeCall,
} from './edge-band';

const listening: EdgeCall = {
  orb: 'listening',
  trouble: null,
  microphoneMuted: false,
};

describe('how the edge band looks in each call state', () => {
  it('sweeps a line while connecting, with no timer', () => {
    expect(edgeLookOf({ ...listening, orb: 'none' })).toMatchObject({
      motion: 'sweep',
      timer: false,
    });
  });

  it("scrolls the person's microphone level while listening", () => {
    expect(edgeLookOf(listening)).toMatchObject({
      motion: 'history',
      follows: 'input',
      timer: true,
    });
  });

  it("scrolls the voice's output while it talks", () => {
    expect(edgeLookOf({ ...listening, orb: 'talking' })).toMatchObject({
      motion: 'history',
      follows: 'output',
    });
  });

  it('breathes on its own while thinking', () => {
    const thinking = edgeLookOf({ ...listening, orb: 'thinking' });

    expect(thinking).toMatchObject({
      motion: 'breathe',
    });
    expect(thinking.follows).toBeUndefined();
  });

  it('goes flat, saying "Mic off", while the microphone is muted', () => {
    const muted = edgeLookOf({ ...listening, microphoneMuted: true });

    expect(muted).toMatchObject({
      motion: 'flat',
      timer: true,
    });
    expect(muted.label).toBe('Mic off');
  });

  it('sweeps while reconnecting, and keeps the timer', () => {
    const reconnecting = edgeLookOf({
      orb: 'none',
      trouble: 'reconnecting',
      microphoneMuted: true,
    });

    expect(reconnecting).toMatchObject({
      motion: 'sweep',
      timer: true,
    });
    expect(reconnecting.label).toBe('Reconnecting…');
  });

  it('names the state as the stage would', () => {
    expect(edgeLookOf(listening).label).toBe('Listening');
    expect(edgeLookOf({ ...listening, orb: 'none' }).label).toBe('Connecting…');
  });
});

// Float32 bars, read in tenths.
const tenths = (history: EdgeHistory): number[] =>
  [...history.bars].map((bar) => Math.round(bar * 10) / 10);

describe('the scrolling history', () => {
  it('puts the newest level at the right and scrolls the rest left', () => {
    const history = new EdgeHistory(4);
    history.push(0.2);
    history.push(0.5);

    expect(tenths(history)).toEqual([0, 0, 0.2, 0.5]);
    history.push(1);
    history.push(0.1);
    history.push(0.3);

    expect(tenths(history)).toEqual([0.5, 1, 0.1, 0.3]);
  });
});

const barsOf = (
  motion: 'sweep' | 'breathe' | 'flat',
  time: number,
): number[] => {
  const bars = new Float32Array(100);
  edgeBars(bars, motion, time);

  return [...bars];
};

describe('the bars that move on their own', () => {
  it('sweeps one hump across a flat line', () => {
    const now = barsOf('sweep', 0.5);
    const raised = now.filter((bar) => bar > 0).length;

    expect(raised).toBeGreaterThan(10);
    expect(raised).toBeLessThan(30);
    expect(Math.max(...now)).toBeLessThanOrEqual(0.7);
    expect(barsOf('sweep', 1)).not.toEqual(now);
  });

  it('breathes in low groups with flat gaps between', () => {
    const now = barsOf('breathe', 1);

    expect(Math.max(...now)).toBeLessThanOrEqual(0.33);
    expect(now.filter((bar) => bar === 0).length).toBeGreaterThan(10);
    expect(barsOf('breathe', 2)).not.toEqual(now);
  });

  it('lies flat', () => {
    expect(barsOf('flat', 3).every((bar) => bar === 0)).toBe(true);
  });
});

describe('the fade at both ends', () => {
  it('fades the ends alike and leaves the middle whole', () => {
    expect(edgeFade(0, 100)).toBeCloseTo(edgeFade(99, 100));
    expect(edgeFade(0, 100)).toBeLessThan(edgeFade(12, 100));
    expect(edgeFade(12, 100)).toBeLessThan(edgeFade(50, 100));
    expect(edgeFade(50, 100)).toBeCloseTo(1);
  });
});
