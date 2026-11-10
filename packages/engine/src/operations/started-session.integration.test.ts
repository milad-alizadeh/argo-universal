import { expect, it } from 'vitest';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import { insertEndedTurn, insertSession } from '#mocks/database';
import { startSessionJourney } from '#mocks/session-journey';

it('keeps an Operation-started Session writable and lists it under its starter, never among its Agents', async () => {
  const host = await startSessionJourney();
  // Gives the starter a Turn, so the list holds its row and its Agents count.
  insertEndedTurn(host.database);
  insertSession(host.database, {
    id: 'started',
    startedBySessionId: 'session-1',
    title: 'Delegated work',
  });

  await host.caller.session.prompt({
    sessionId: 'started',
    prompt: [{ type: 'text', text: 'Continue delegated work' }],
  });
  await host.caller.session.cancel({ sessionId: 'started' });
  await waitForAcpSessionIdle(host, 'started');
  expect(await host.caller.session.get({ sessionId: 'started' })).toMatchObject(
    {
      startedBySessionId: 'session-1',
      state: 'idle',
    },
  );
  expect(await host.caller.session.list({ query: 'Delegated' })).toMatchObject({
    sessions: [
      {
        sessionId: 'started',
        startedBySessionId: 'session-1',
        parentSessionId: null,
      },
    ],
  });
  expect(
    await host.caller.session.listAgents({ sessionId: 'session-1' }),
  ).toEqual([]);
  expect(await host.caller.session.list({})).toMatchObject({
    sessions: expect.arrayContaining([
      expect.objectContaining({
        sessionId: 'session-1',
        subagents: { total: 0, running: 0 },
      }),
    ]),
  });
});
