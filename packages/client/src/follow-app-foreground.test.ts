import {
  focusManager,
  QueryClient,
  QueryObserver,
} from '@tanstack/react-query';
import { expect, it, type Mock, vi } from 'vitest';
import {
  type AppStateSource,
  followAppForeground,
  followAppForegroundOnNative,
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

const ignore = (): void => {
  // The test reads the Server's calls, not the result.
};

// Watches one list, sends the App to the background and back, and returns the Server's calls once `settled` holds.
async function askedAfterReturning(
  staleTime: number,
  settled: (queryFn: Mock<() => Promise<string>>) => Promise<void>,
): Promise<number> {
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
  await settled(queryFn);

  unsubscribe();
  stop();
  client.unmount();

  return queryFn.mock.calls.length;
}

it('refetches a stale query when the App returns to the foreground', async () => {
  const calls = await askedAfterReturning(0, (queryFn) =>
    vi.waitFor(() => expect(queryFn).toHaveBeenCalledTimes(2)),
  );

  expect(calls).toBe(2);
});

it('leaves a fresh query alone when the App returns to the foreground', async () => {
  const calls = await askedAfterReturning(
    60_000,
    () => new Promise((resolve) => setTimeout(resolve, 20)),
  );

  expect(calls).toBe(1);
});

it('follows the App on a phone and leaves the browser tab focus alone on the web', () => {
  const phone = fakeAppState();
  const web = fakeAppState();
  const addPhone = vi.spyOn(phone, 'addEventListener');
  const addWeb = vi.spyOn(web, 'addEventListener');

  const stopPhone = followAppForegroundOnNative('ios', phone);
  const stopWeb = followAppForegroundOnNative('web', web);
  focusManager.subscribe(ignore)();

  expect(stopWeb).toBeUndefined();
  expect(addPhone).toHaveBeenCalledOnce();
  expect(addWeb).not.toHaveBeenCalled();

  stopPhone?.();
});
