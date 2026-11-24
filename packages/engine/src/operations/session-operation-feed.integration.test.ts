import { expect, it, vi } from 'vitest';
import { runOperation } from '#mocks/operations';
import { sessionAccessHost, openAccessSession } from '#mocks/session-access';

it('records discovery and a refused Operation in the calling Session Feed without exposing its token', async () => {
  const fixture = await sessionAccessHost();
  const session = await openAccessSession(fixture, 'Inspect Argo');

  await session.caller.operations.list.query({ filter: 'project' });
  await expect(
    runOperation(session.caller.operations, {
      id: 'project.list',
      params: { unexpected: 42 },
    }),
  ).rejects.toMatchObject({ data: { code: 'BAD_REQUEST' } });

  // The output of `operations.list` is over 16 KB, so its row goes through a Blob and is stored once the Blob file is written, a moment after the call ends.
  const page = await vi.waitFor(async () => {
    const tail = await fixture.host.caller.feed.page({
      sessionId: session.sessionId,
      direction: 'tail',
    });

    expect(tail.rows).toEqual(
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

    return tail;
  });

  expect(JSON.stringify(page.rows)).not.toContain(session.token);
}, 30_000);
