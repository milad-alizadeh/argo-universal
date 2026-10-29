import { assert, expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { runOperation } from '#mocks/operations';
import { openAccessSession, sessionAccessHost } from '#mocks/session-access';

it('keeps an Operation Tool call row under its argo id across an Engine restart', async () => {
  const fixture = await sessionAccessHost();
  const session = await openAccessSession(fixture, 'Inspect Argo');
  const { sessionId } = session;
  await runOperation(session.caller.operations, {
    id: 'project.list',
    params: {},
  });

  const { rows } = await fixture.host.caller.feed.page({
    sessionId,
    direction: 'tail',
  });

  const row = rows.find(
    (item) =>
      item.sessionUpdate === 'tool_call_update' && item.name === 'project.list',
  );

  assert(row?.sessionUpdate === 'tool_call_update');
  expect(row).toMatchObject({
    id: `argo:${row.toolCallId}`,
    state: 'settled',
    status: 'completed',
  });
  await fixture.host.stop();

  const restored = await startEngineTestHost({
    home: fixture.host.home,
    acp: fixture.host.agent,
  });

  try {
    expect(await restored.caller.feed.row({ sessionId, id: row.id })).toEqual(
      row,
    );
  } finally {
    await restored.stop();
  }
}, 30_000);
