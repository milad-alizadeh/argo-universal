import { scenarios, sharedReply } from '@repo/mocks/agent/scenarios';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import { withoutSessionAccess } from '#mocks/session-access';

const exitTitle = 'Agent exited with status 17';

const turnStatusQuery =
  'SELECT status, stop_reason FROM turn WHERE session_id = ?';

async function waitForClosed(
  events: AsyncIterable<{ type: string }>,
): Promise<void> {
  for await (const event of events) if (event.type === 'closed') return;
}

type AgentProcess = Awaited<
  ReturnType<typeof startAcpEngine>
>['agent']['processes'][number];

async function readMethod(
  process: AgentProcess | undefined,
): Promise<string | undefined> {
  return (await process?.readRequest())?.method;
}

it('without Agent access, a shared Agent exit ends both Turns with error and stderr and the next Send resumes without auto-reopening', async () => {
  const release = Promise.withResolvers<void>();

  const host = await startAcpEngine({
    ...scenarios['exit-with-stderr'],
    sessionAccess: withoutSessionAccess,
    steps: [
      { type: 'gate', waitFor: release.promise },
      ...scenarios['exit-with-stderr'].steps,
    ],
  });

  const session = await host.caller.session.new(emptySessionInput);
  const sibling = await host.caller.session.new(emptySessionInput);

  const siblingEvents = await host.caller.feed.subscribe({
    ...sibling,
    after: null,
  });

  await host.caller.session.prompt({
    ...sibling,
    prompt: [{ type: 'text', text: 'Sibling' }],
  });
  const events = await host.caller.feed.subscribe({ ...session, after: null });
  await host.caller.session.prompt({
    ...session,
    prompt: [{ type: 'text', text: 'First' }],
  });

  for (let index = 0; index < 5; index += 1)
    await host.agent.processes[0]?.readRequest();
  release.resolve();

  await waitForClosed(events);

  await waitForClosed(siblingEvents);

  const siblingPage = await host.caller.feed.page({
    ...sibling,
    direction: 'tail',
  });

  expect(
    siblingPage.rows.filter(
      (row) => row.sessionUpdate === 'notice' && row.title === exitTitle,
    ),
  ).toHaveLength(1);
  expect(
    host.database.$client.prepare(turnStatusQuery).get(sibling.sessionId),
  ).toEqual({ status: 'ended', stop_reason: 'error' });
  const page = await host.caller.feed.page({ ...session, direction: 'tail' });
  expect(
    page.rows.filter(
      (row) => row.sessionUpdate === 'notice' && row.title === exitTitle,
    ),
  ).toHaveLength(1);
  expect(page.rows).toContainEqual(
    expect.objectContaining({
      sessionUpdate: 'notice',
      title: exitTitle,
      description: 'Agent fixture failed\n',
    }),
  );
  expect(
    host.database.$client.prepare(turnStatusQuery).get(session.sessionId),
  ).toEqual({ status: 'ended', stop_reason: 'error' });
  expect(host.agent.processes).toHaveLength(1);
  await host.caller.session.prompt({
    ...session,
    prompt: [{ type: 'text', text: 'Second' }],
  });
  await waitForAcpSessionIdle(host, session.sessionId);
  expect(host.agent.processes).toHaveLength(2);

  const resumed = await host.caller.feed.page({
    ...session,
    direction: 'tail',
  });

  expect(resumed.rows).toContainEqual(
    expect.objectContaining({
      sessionUpdate: 'agent_message',
      content: [{ type: 'text', text: sharedReply }],
    }),
  );
  const process = host.agent.processes[1];
  expect(await readMethod(process)).toBe('initialize');
  expect(await readMethod(process)).toBe('session/resume');
});
