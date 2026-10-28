import { turn } from '@repo/db/schema';
import { assert, expect, it } from 'vitest';
import { insertSession } from '#mocks/database';
import { startSessionJourney } from '#mocks/session-journey';

it('keeps a started Session on a page that does not contain its parent', async () => {
  const host = await startSessionJourney();

  const ids = [
    'parent',
    ...Array.from({ length: 50 }, (_, index) => `other-${index}`),
    'started',
  ];

  for (const [index, id] of ids.entries())
    insertSession(host.database, {
      id,
      title: id,
      activityAt: index,
      startedBySessionId: id === 'started' ? 'parent' : null,
    });
  host.database
    .insert(turn)
    .values(
      ids.map((id) => ({
        id: `turn-${id}`,
        sessionId: id,
        status: 'ended' as const,
        startedAt: 1,
        endedAt: 2,
        stopReason: 'end_turn' as const,
      })),
    )
    .run();
  const first = await host.caller.session.list({});

  expect(first.sessions).toHaveLength(50);
  expect(first.sessions[0]).toMatchObject({
    sessionId: 'started',
    startedBySessionId: 'parent',
  });
  expect(first.sessions.map((session) => session.sessionId)).not.toContain(
    'parent',
  );
  assert(first.nextCursor);

  const second = await host.caller.session.list({
    cursor: first.nextCursor,
    direction: 'forward',
  });

  expect(second.sessions.map((session) => session.sessionId)).toContain(
    'parent',
  );
  expect(second.nextCursor).toBeNull();
});
