import { existsSync } from 'node:fs';
import { feedRow, session, turn } from '@repo/db/schema';
import { eq } from 'drizzle-orm';
import { expect, it } from 'vitest';
import { startAcpEngine } from '#mocks/acp-engine';
import { promptedArchiveSession } from '#mocks/archive';
import { insertSession } from '#mocks/database';

const childTurnId = 'child-turn';

const childToolId = 'child-tool';

it('archives borrowed child Checkouts and cancels child Turns in the same durable decision; Undo clears both archive timestamps', async () => {
  const host = await startAcpEngine({ steps: [] });
  const created = await promptedArchiveSession(host);
  insertSession(host.database, {
    id: 'child',
    parentSessionId: created.sessionId,
    checkoutPath: created.path,
  });
  host.database
    .insert(turn)
    .values({ id: childTurnId, sessionId: 'child', status: 'running' })
    .run();
  host.database
    .insert(feedRow)
    .values({
      sessionId: 'child',
      id: childToolId,
      turnId: childTurnId,
      position: 0,
      revision: 1,
      state: 'open',
      sessionUpdate: 'tool_call_update',
      payloadVersion: 1,
      payload: {
        toolCallId: childToolId,
        title: 'Read',
        kind: 'read',
        status: 'in_progress',
        content: [],
      },
    })
    .run();
  await expect(
    host.caller.session.archive({ sessionId: 'child' }),
  ).rejects.toMatchObject({ code: 'CONFLICT' });
  await host.caller.session.archive({ sessionId: created.sessionId });

  const child = host.database
    .select()
    .from(session)
    .where(eq(session.id, 'child'))
    .get();

  expect(child?.archivedAt).toBeTypeOf('number');
  expect(
    (await host.caller.feed.page({ sessionId: 'child', direction: 'tail' }))
      .rows,
  ).toMatchObject([{ id: childToolId, state: 'settled', status: 'cancelled' }]);
  expect(
    host.database.select().from(turn).where(eq(turn.id, childTurnId)).get(),
  ).toMatchObject({ status: 'ended', stopReason: 'cancelled' });
  await host.caller.session.unarchive({ sessionId: created.sessionId });
  expect(
    host.database.select().from(session).where(eq(session.id, 'child')).get()
      ?.archivedAt,
  ).toBeNull();
  expect(existsSync(created.path)).toBe(true);
});
