import { expect, it } from 'vitest';
import { sessionAccessHost, openAccessSession } from '#mocks/session-access';

it('records discovery and a refused Operation in the calling Session Feed without exposing its token', async () => {
  const fixture = await sessionAccessHost();
  const session = await openAccessSession(fixture, 'Inspect Argo');

  await session.caller.operations.list.query({ filter: 'project' });
  await expect(
    session.caller.operations.run.mutate({
      id: 'project.list',
      params: { unexpected: 42 },
    }),
  ).rejects.toMatchObject({ data: { code: 'BAD_REQUEST' } });

  const page = await fixture.host.caller.feed.page({
    sessionId: session.sessionId,
    direction: 'tail',
  });

  expect(page.rows).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        sessionId: session.sessionId,
        sessionUpdate: 'tool_call_update',
        name: 'operations.list',
        status: 'completed',
        rawInput: { filter: 'project' },
      }),
      expect.objectContaining({
        sessionId: session.sessionId,
        sessionUpdate: 'tool_call_update',
        name: 'project.list',
        status: 'failed',
        rawInput: { unexpected: 42 },
      }),
    ]),
  );
  expect(JSON.stringify(page.rows)).not.toContain(session.token);
}, 30_000);
