import { feedScenario } from '@repo/mocks/agent/feed-scenarios';
import { expect, it, vi } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';

type Host = Awaited<ReturnType<typeof startAcpEngine>>;

const todos = [{ content: 'Read' }, { content: 'Change' }, { content: 'Test' }];

async function todoRows(
  host: Pick<Host, 'caller'>,
  sessionId: string,
): Promise<unknown[]> {
  const page = await host.caller.feed.page({ sessionId, direction: 'tail' });

  return page.rows.filter((row) => row.sessionUpdate === 'plan_update');
}

const steps = (statuses: string[]): object[] => [
  {
    plan: {
      type: 'items',
      entries: statuses.map((status) => expect.objectContaining({ status })),
    },
  },
];

it('keeps the Todo list an Agent sets and steps through as one Feed row', async () => {
  const host = await startAcpEngine({ steps: [] });
  const { sessionId } = await host.caller.session.new(emptySessionInput);

  await expect(
    host.caller.session.setTodos({ sessionId, todos }),
  ).resolves.toEqual({ done: 0, total: 3 });
  await expect(
    host.caller.session.setTodoStep({
      sessionId,
      step: 1,
      status: 'completed',
    }),
  ).resolves.toEqual({ done: 1, total: 3 });

  await vi.waitFor(async () =>
    expect(await todoRows(host, sessionId)).toMatchObject(
      steps(['completed', 'in_progress', 'pending']),
    ),
  );
});

it('refuses a step of a Todo list the Agent has not set, and a step past its end', async () => {
  const host = await startAcpEngine({ steps: [] });
  const { sessionId } = await host.caller.session.new(emptySessionInput);
  const step = { sessionId, step: 4, status: 'completed' as const };

  await expect(host.caller.session.setTodoStep(step)).rejects.toThrow(
    'Run session.setTodos',
  );
  await host.caller.session.setTodos({ sessionId, todos });
  await expect(host.caller.session.setTodoStep(step)).rejects.toThrow(
    'there is no step 4',
  );
});

it('keeps no Todo list while the person has it turned off', async () => {
  const host = await startAcpEngine({ steps: [] });
  const { sessionId } = await host.caller.session.new(emptySessionInput);

  await host.caller.agent.setTodoList({ enabled: false });

  await expect(
    host.caller.session.setTodos({ sessionId, todos }),
  ).rejects.toThrow('turned off in Settings');
  expect(await todoRows(host, sessionId)).toEqual([]);
});

const reported = feedScenario([
  {
    sessionUpdate: 'plan',
    entries: [{ content: 'First', priority: 'high', status: 'pending' }],
  },
  {
    sessionUpdate: 'plan_update',
    plan: { type: 'markdown', planId: 'design', content: '# Design' },
  },
]);

it('drops a checklist an Agent reports through ACP while the Todo list is off, and keeps its Written plan', async () => {
  const host = await startAcpEngine(reported);

  await host.caller.agent.setTodoList({ enabled: false });

  const { sessionId } = await host.caller.session.new({
    ...emptySessionInput,
    prompt: [{ type: 'text', text: 'Show the result' }],
  });

  await waitForAcpSessionIdle(host, sessionId);

  expect(await todoRows(host, sessionId)).toMatchObject([
    { plan: { type: 'markdown' } },
  ]);
});
