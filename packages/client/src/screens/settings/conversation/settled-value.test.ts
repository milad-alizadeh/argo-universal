import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SettledValue } from './settled-value';

beforeEach(() => vi.useFakeTimers());

afterEach(() => vi.useRealTimers());

describe('A value sent once it settles', () => {
  it('sends only the last value of a drag, once it rests', () => {
    const sent: number[] = [];
    const value = new SettledValue<number>(250);
    const send = (next: number): void => void sent.push(next);

    value.push(10, send);
    value.push(20, send);
    vi.advanceTimersByTime(200);
    value.push(30, send);
    vi.advanceTimersByTime(249);

    expect(sent).toEqual([]);

    vi.advanceTimersByTime(1);

    expect(sent).toEqual([30]);
  });

  it('sends what is waiting at once when flushed, and nothing afterwards', () => {
    const sent: number[] = [];
    const value = new SettledValue<number>(250);
    const send = (next: number): void => void sent.push(next);

    value.push(40, send);
    value.flush();
    vi.advanceTimersByTime(500);

    expect(sent).toEqual([40]);
  });

  it('sends nothing when flushed with nothing waiting', () => {
    const sent: number[] = [];
    const value = new SettledValue<number>(250);

    value.flush();

    expect(sent).toEqual([]);
  });
});
