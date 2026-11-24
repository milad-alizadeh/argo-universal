import { focusManager, QueryClient, QueryObserver } from '@tanstack/react-query';
import { afterEach, expect, it, vi } from 'vitest';
import {
  type AppStateSource,
  followAppForeground,
} from './follow-app-foreground';

interface MovableAppState extends AppStateSource {
  move: (state: string) => void;
}

// An AppState that the test moves between foreground and background.
function fakeAppState(): MovableAppState {
  const listeners = new Set<(state: string) => void>();

  return {
    addEventListener: (_event, listener) => {
      listeners.add(listener);

      return {
        remove: (): void => {
          listeners.delete(listener);
        },
      };
    },
    move: (state) => {
      for (const listener of listeners) listener(state);
    },
  };
}

afterEach(() => {
  focusManager.setEventListener(() => (): void => {
    // Nothing to release.
  });
});

const ignore = (): void => {
  // The test reads the Server's calls, not the result.
};

// Watches one list, sends the App to the background and back, and returns how many times the Server was asked.
async function askedAfterReturning(staleTime: number): Promise<number> {
  const queryFn = vi.fn<() => Promise<string>>(() => Promise.resolve('rows'));

  // QueryClientProvider mounts its client; a mounted client is what listens for focus.
  const client = new QueryClient();
  client.mount();

  const watcher = new QueryObserver(client, {
    queryKey: ['list'],
    queryFn,
    staleTime,
  });

  const appState = fakeAppState();
  const stop = followAppForeground(appState);
  const unsubscribe = watcher.subscribe(ignore);
  await vi.waitFor(() => expect(queryFn).toHaveBeenCalledTimes(1));

  appState.move('background');
  appState.move('active');
  await new Promise((resolve) => setTimeout(resolve, 20));

  unsubscribe();
  stop();
  client.unmount();

  return queryFn.mock.calls.length;
}

it('refetches a stale query when the App returns to the foreground', async () => {
  expect(await askedAfterReturning(0)).toBe(2);
});

it('leaves a fresh query alone when the App returns to the foreground', async () => {
  expect(await askedAfterReturning(60_000)).toBe(1);
});
