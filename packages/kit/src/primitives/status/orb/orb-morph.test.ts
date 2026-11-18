import { describe, expect, it } from 'vitest';
import { makeMorph, morphProgress, settleMorph } from './orb-morph';

const half = 0.5;

const quarter = 0.25;

describe('an orb taking a state', () => {
  it('shows its first state at once', () => {
    const morph = makeMorph();
    const first = { target: 'working', now: 0, fadesIn: false } as const;

    expect(morphProgress(morph, first)).toBe(1);
    expect(morph).toMatchObject({ from: 'working', to: 'working' });
  });

  it('fades its first state in from nothing over 400ms when asked to', () => {
    const morph = makeMorph();
    const first = { target: 'working', fadesIn: true } as const;

    expect(morphProgress(morph, { ...first, now: 1000 })).toBe(0);
    expect(morph).toMatchObject({ from: null, to: 'working' });
    expect(morphProgress(morph, { ...first, now: 1200 })).toBe(half);
    expect(morphProgress(morph, { ...first, now: 1400 })).toBe(1);
    expect(morphProgress(morph, { ...first, now: 9000 })).toBe(1);
  });

  it('morphs from the state it shows to a new one over 400ms', () => {
    const morph = makeMorph();
    const next = { target: 'searching', fadesIn: false } as const;

    morphProgress(morph, { target: 'working', now: 0, fadesIn: false });

    expect(morphProgress(morph, { ...next, now: 1000 })).toBe(0);
    expect(morph).toMatchObject({ from: 'working', to: 'searching' });
    expect(morphProgress(morph, { ...next, now: 1200 })).toBe(half);
    expect(morphProgress(morph, { ...next, now: 1400 })).toBe(1);
  });

  it('finishes the morph in flight before it takes the next state, so no shape is cut short', () => {
    const morph = makeMorph();
    const later = { target: 'composing', fadesIn: false } as const;

    morphProgress(morph, { target: 'working', now: 0, fadesIn: false });
    morphProgress(morph, { target: 'searching', now: 1000, fadesIn: false });

    expect(morphProgress(morph, { ...later, now: 1100 })).toBe(quarter);
    expect(morph).toMatchObject({ from: 'working', to: 'searching' });
    expect(morphProgress(morph, { ...later, now: 1400 })).toBe(0);
    expect(morph).toMatchObject({ from: 'searching', to: 'composing' });
  });

  it('takes a state at once when it is held still', () => {
    const morph = makeMorph();

    morphProgress(morph, { target: 'working', now: 0, fadesIn: false });
    settleMorph(morph, 'searching');

    const held = { target: 'searching', now: 10, fadesIn: false } as const;

    expect(morphProgress(morph, held)).toBe(1);
    expect(morph).toMatchObject({ from: 'searching', to: 'searching' });
  });
});
