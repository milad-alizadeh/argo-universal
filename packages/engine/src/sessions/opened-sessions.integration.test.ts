import { expect, it } from 'vitest';
import { closeTestSession } from '#mocks/close-session';
import { delegationJourney, startDelegated } from '#mocks/session-delegation';
import { sessionSources } from '#mocks/session-sources';
import { OpenSessions } from './open-sessions';
import {
  type StartedSessionObserver,
  watchStartedSessions,
} from './opened-sessions';

type Journey = Awaited<ReturnType<typeof delegationJourney>>;

type Observation = {
  stop: () => void;
  enrolled: string[];
  followed: string[];
  detached: string[];
  stopped: string[];
};

function observe({ host, caller }: Journey): Observation {
  const sources = sessionSources(host.openSessions);
  const open = new OpenSessions(sources);
  const enrolled: string[] = [];
  const followed: string[] = [];
  const detached: string[] = [];
  const stopped: string[] = [];

  const register: StartedSessionObserver = (id) => {
    enrolled.push(id);

    return {
      follow: () => {
        followed.push(id);

        return {
          unsubscribe: () => {
            detached.push(id);
          },
        };
      },
      stop: () => {
        stopped.push(id);
      },
    };
  };

  const stop = watchStartedSessions(
    { ...sources, open },
    caller.sessionId,
    register,
  );

  return { stop, enrolled, followed, detached, stopped };
}

it('enrolls direct Started Sessions before and after observation begins', async () => {
  const journey = await delegationJourney();
  const alreadyOpen = await startDelegated(journey);
  const watching = observe(journey);

  try {
    await startDelegated(journey, alreadyOpen);
    const newlyOpen = await startDelegated(journey);

    expect(watching.enrolled).toEqual([
      alreadyOpen.sessionId,
      newlyOpen.sessionId,
    ]);
    expect(watching.followed).toEqual(watching.enrolled);
  } finally {
    watching.stop();
  }
});

it('preserves the observer across reopening and disposes both subscriptions', async () => {
  const journey = await delegationJourney();
  const child = await startDelegated(journey);
  const watching = observe(journey);
  const { sessionId } = child;

  try {
    await closeTestSession(journey.host, { sessionId });
    await expect.poll(() => watching.detached).toEqual([sessionId]);
    await journey.host.caller.session.open({ sessionId });

    await closeTestSession(journey.host, { sessionId });
    await expect.poll(() => watching.detached).toEqual([sessionId, sessionId]);
    await journey.host.caller.session.open({ sessionId });

    expect(watching.enrolled).toEqual([sessionId]);
    expect(watching.followed).toEqual([sessionId, sessionId, sessionId]);
    expect(watching.stopped).toEqual([]);
  } finally {
    watching.stop();
  }

  expect(watching.detached).toEqual([sessionId, sessionId, sessionId]);
  expect(watching.stopped).toEqual([sessionId]);
});
