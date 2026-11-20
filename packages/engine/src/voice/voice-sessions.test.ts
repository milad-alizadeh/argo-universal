import { expect, it } from 'vitest';
import type { TurnHappening } from '../sessions';
import type { SessionHappening } from './session-link';
import { voiceSessions } from './voice-sessions';

type TurnListener = (happening: TurnHappening) => void;

// The call's view of one Session: what it reports, and what the call heard.
type HeardSessions = {
  report: (happening: TurnHappening) => void;
  heard: SessionHappening[];
  stop: () => void;
};

const noFeed = (): undefined => {};

const crashed: TurnHappening = {
  type: 'turn.ended',
  turnId: 't1',
  stopReason: 'error',
  error: 'The Agent crashed',
};

// Sessions whose one Session reports Turn happenings the test sends, and that has no Feed open.
function sessionsHeard(): HeardSessions {
  const listeners = new Set<TurnListener>();
  const heard: SessionHappening[] = [];

  const sessions = voiceSessions(
    {
      findFeed: noFeed,
      watchSessionSnapshot: () => ({ unsubscribe: (): void => {} }),
    },
    {
      prompt: () => Promise.reject(new Error('Not sent')),
      stop: () => Promise.resolve(false),
      capture: () => Promise.reject(new Error('No capture in this test')),
      watchTurns: (_sessionId, listener) => {
        listeners.add(listener);

        return (): boolean => listeners.delete(listener);
      },
      watchOpened: () => (): void => {},
    },
  );

  const stop = sessions.watch('s1', (happening) => heard.push(happening));

  const report = (happening: TurnHappening): void => {
    for (const listener of listeners) listener(happening);
  };

  return { report, heard, stop };
}

it("tells the call a Turn's end as the Session reports it", () => {
  const { report, heard } = sessionsHeard();

  report({ type: 'prompt.taken', queuedId: 'q1', turnId: 't1' });
  report(crashed);

  expect(heard).toEqual([
    { type: 'turn.ended', stopReason: 'error', error: 'The Agent crashed' },
  ]);
});

it("stops hearing the Session's Turns when the call stops watching", () => {
  const { report, heard, stop } = sessionsHeard();

  stop();
  report(crashed);

  expect(heard).toEqual([]);
});
