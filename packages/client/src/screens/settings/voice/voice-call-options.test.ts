import { describe, expect, it } from 'vitest';
import { idleChoices, idleLabel, percentLabel } from './voice-call-options';

describe('How long a silent call waits', () => {
  it('says a wait in the largest whole unit', () => {
    expect(idleLabel(30)).toBe('30 seconds');
    expect(idleLabel(60)).toBe('1 minute');
    expect(idleLabel(300)).toBe('5 minutes');
    expect(idleLabel(3600)).toBe('1 hour');
    expect(idleLabel(90)).toBe('90 seconds');
  });

  it('offers the usual waits, with the default among them', () => {
    expect(idleChoices(300).map(({ label }) => label)).toEqual([
      '1 minute',
      '2 minutes',
      '5 minutes',
      '10 minutes',
      '30 minutes',
      '1 hour',
    ]);
  });

  it('keeps a wait set elsewhere, such as by an Agent, in its place among them', () => {
    expect(idleChoices(90).map(({ value }) => value)).toEqual([
      '60',
      '90',
      '120',
      '300',
      '600',
      '1800',
      '3600',
    ]);
  });
});

describe('Volume and gain', () => {
  it('reads as a percentage', () => {
    expect(percentLabel(80)).toBe('80%');
    expect(percentLabel(150)).toBe('150%');
  });
});
