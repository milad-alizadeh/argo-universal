import { describe, expect, it, vi } from 'vitest';
import { type AppStates, onForeground } from './app-foreground';

type Listener = (state: string) => void;

// AppState as the platform reports it: one listener per subscription, removed on unsubscribe.
type FakeAppState = AppStates & {
  report: (state: string) => void;
  listeners: Set<Listener>;
};

function fakeAppState(initial: string): FakeAppState {
  const listeners = new Set<Listener>();

  const appState: FakeAppState = {
    currentState: initial,
    listeners,
    addEventListener: (_, listener) => {
      listeners.add(listener);

      return { remove: (): void => void listeners.delete(listener) };
    },
    report: (state) => {
      appState.currentState = state;

      for (const listener of listeners) listener(state);
    },
  };

  return appState;
}

describe('onForeground', () => {
  it('calls back when the App returns from the background', () => {
    const appState = fakeAppState('active');
    const returned = vi.fn<() => void>();

    onForeground(appState, returned);
    appState.report('background');
    appState.report('active');

    expect(returned).toHaveBeenCalledOnce();
  });

  it('calls back once per return, however many steps the platform reports on the way', () => {
    const appState = fakeAppState('active');
    const returned = vi.fn<() => void>();

    onForeground(appState, returned);

    for (const state of ['inactive', 'background', 'inactive', 'active'])
      appState.report(state);
    appState.report('active');

    expect(returned).toHaveBeenCalledOnce();
  });

  it('stays quiet while the App only leaves the foreground', () => {
    const appState = fakeAppState('active');
    const returned = vi.fn<() => void>();

    onForeground(appState, returned);
    appState.report('inactive');
    appState.report('background');

    expect(returned).not.toHaveBeenCalled();
  });

  it('stops listening once unsubscribed', () => {
    const appState = fakeAppState('active');
    const returned = vi.fn<() => void>();

    const stop = onForeground(appState, returned);

    stop();
    appState.report('background');
    appState.report('active');

    expect(returned).not.toHaveBeenCalled();
    expect(appState.listeners.size).toBe(0);
  });
});
