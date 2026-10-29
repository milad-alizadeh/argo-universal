import { session } from '@repo/db/schema';
import { inArray } from 'drizzle-orm';
import { expect, it, vi } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';

const missingChild = 'No Subagent was persisted';

it('discards an Empty Session with all its Subagents instead of promoting them to root Sessions', async () => {
  const host = await startAcpEngine({ steps: [] });
  const { sessionId } = await host.caller.session.new(emptySessionInput);
  await requireScriptedProcessAt(host.agent.processes).play(
    [
      {
        type: 'update',
        update: {
          sessionUpdate: 'subagent_update',
          sessionId: 'child',
          state: { state: 'running' },
        },
      },
      {
        type: 'update',
        sessionId: 'child',
        update: {
          sessionUpdate: 'subagent_update',
          sessionId: 'nested',
          state: { state: 'running' },
        },
      },
    ],
    'owned-1',
  );
  await vi.waitFor(async () =>
    expect(await host.caller.session.listAgents({ sessionId })).toHaveLength(1),
  );
  const [child] = await host.caller.session.listAgents({ sessionId });

  if (!child) throw new Error(missingChild);
  await vi.waitFor(async () =>
    expect(
      await host.caller.session.listAgents({ sessionId: child.sessionId }),
    ).toHaveLength(1),
  );

  const [nested] = await host.caller.session.listAgents({
    sessionId: child.sessionId,
  });

  if (!nested) throw new Error(missingChild);
  await host.caller.session.close({ sessionId });
  expect(
    host.database
      .select()
      .from(session)
      .where(
        inArray(session.id, [sessionId, child.sessionId, nested.sessionId]),
      )
      .all(),
  ).toEqual([]);
  expect(await host.caller.session.list({ archived: false })).toMatchObject({
    sessions: [],
  });
  await expect(
    host.caller.session.prompt({
      sessionId: child.sessionId,
      prompt: [{ type: 'text', text: 'Read-only' }],
    }),
  ).rejects.toMatchObject({ code: 'NOT_FOUND' });
});
