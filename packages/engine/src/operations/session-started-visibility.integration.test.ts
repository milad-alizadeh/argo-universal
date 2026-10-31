import { expect, it } from 'vitest';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import { insertSession } from '#mocks/database';
import { startSessionJourney } from '#mocks/session-journey';

it('keeps an Operation-started Session visible when its parent is archived or filtered out', async () => {
  const host = await startSessionJourney();
  insertSession(host.database, {
    id: 'started',
    startedBySessionId: 'session-1',
    title: 'Independent investigation',
  });

  await host.caller.session.prompt({
    sessionId: 'started',
    prompt: [{ type: 'text', text: 'Investigate independently' }],
  });
  await host.caller.session.cancel({ sessionId: 'started' });
  await waitForAcpSessionIdle(host, 'started');
  await host.caller.session.archive({ sessionId: 'session-1' });
  const active = await host.caller.session.list({ archived: false });

  expect(active.sessions).toMatchObject([
    { sessionId: 'started', startedBySessionId: 'session-1', archivedAt: null },
  ]);
  expect(await host.caller.session.list({ query: 'Independent' })).toEqual(
    active,
  );
});

it('lists a Session an Agent started before its first Turn, named until a prompt names it', async () => {
  const host = await startSessionJourney();
  insertSession(host.database, {
    id: 'started',
    startedBySessionId: 'session-1',
  });

  const { sessions } = await host.caller.session.list({ archived: false });

  expect(
    sessions.find((session): boolean => session.sessionId === 'started'),
  ).toMatchObject({ startedBySessionId: 'session-1', title: 'New Session' });
});
