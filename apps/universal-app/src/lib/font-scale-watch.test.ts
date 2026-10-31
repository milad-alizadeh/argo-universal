import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fontScaleEvent } from './font-scale';

/*
 * React Native is the edge here (Prickles TS7): the Activity's event arrives through `DeviceEventEmitter` and the
 * scale lands in `Dimensions`, both of which only exist on a device. The fake stands in for the pair so the
 * behaviour the Activity relies on can be proven without one.
 */
const listeners = new Map<string, (scale: number) => void>();

const metrics = {
  window: { width: 411, height: 866, scale: 2.625, fontScale: 1 },
  screen: { width: 411, height: 914, scale: 2.625, fontScale: 1 },
};

const set = vi.fn();

vi.mock('react-native', () => ({
  DeviceEventEmitter: {
    addListener: (event: string, listener: (scale: number) => void) =>
      listeners.set(event, listener),
  },
  Dimensions: {
    get: (which: 'window' | 'screen') => metrics[which],
    set: (...args: unknown[]) => set(...args),
  },
}));

const { watchFontScale } = await import('./font-scale-watch.native');

beforeEach(() => {
  listeners.clear();
  set.mockClear();
  watchFontScale();
});

describe('watchFontScale', () => {
  it('listens for the scale the Activity sends', () => {
    expect(listeners.has(fontScaleEvent)).toBe(true);
  });

  it('reports a new scale against the sizes the window already has', () => {
    listeners.get(fontScaleEvent)?.(2);

    expect(set).toHaveBeenCalledWith({
      window: { width: 411, height: 866, scale: 2.625, fontScale: 2 },
      screen: { width: 411, height: 914, scale: 2.625, fontScale: 2 },
    });
  });

  it('says nothing when the scale is the one the window already reports', () => {
    listeners.get(fontScaleEvent)?.(1);

    expect(set).not.toHaveBeenCalled();
  });
});
