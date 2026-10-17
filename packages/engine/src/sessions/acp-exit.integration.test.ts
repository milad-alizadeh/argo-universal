import { scenarios, sharedReply } from '@repo/mocks/agent/scenarios';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle, waitForAcpSnapshot } from '#mocks/acp-feed';
import { createScriptedAgentProcess } from '#mocks/scripted-agent';

const exitTitle = 'Agent exited with status 17';

// Inside the Engine's exit drain, so the exit still names why the output closed.
const lateExitMs = 100;

const turnStatusQuery =
  'SELECT status, stop_reason FROM turn WHERE session_id = ?';

it('an Agent exit ends the Turn with error and stderr, closes the Session, and the next Send resumes without auto-reopening', async () => {
  const release = Promise.withResolvers<void>();

  const host = await startAcpEngine({
    ...scenarios['exit-with-stderr'],
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

  for await (const event of events) if (event.type === 'closed') break;

  for await (const event of siblingEvents) if (event.type === 'closed') break;

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
  expect((await process?.readRequest())?.method).toBe('initialize');
  expect((await process?.readRequest())?.method).toBe('session/resume');
});

it('an Agent exit after Stop preserves the cancelled Turn and publishes the exit Notice with stderr', async () => {
  const host = await startAcpEngine(scenarios['ignores-cancel']);

  const session = await host.caller.session.new(emptySessionInput);
  const events = await host.caller.feed.subscribe({ ...session, after: null });
  await host.caller.session.prompt({
    ...session,
    prompt: [{ type: 'text', text: 'First' }],
  });
  await host.caller.session.cancel(session);
  await waitForAcpSnapshot(
    host,
    session.sessionId,
    (snapshot) => snapshot.activeTurnId === null,
  );
  await host.agent.processes[0]?.play(
    [{ type: 'exit', code: 17, stderr: 'Stopped Agent failed' }],
    'owned-1',
  );

  for await (const event of events) if (event.type === 'closed') break;
  const page = await host.caller.feed.page({ ...session, direction: 'tail' });
  expect(page.rows).toContainEqual(
    expect.objectContaining({
      sessionUpdate: 'notice',
      title: exitTitle,
      description: 'Stopped Agent failed',
    }),
  );
  expect(
    host.database.$client.prepare(turnStatusQuery).get(session.sessionId),
  ).toEqual({ status: 'ended', stop_reason: 'cancelled' });
});

// A real Agent's output can close before its exit is seen; the exit still ends the Turn, and the Feed closes with no failure, so the App shows no Failed to Launch.
it('an Agent whose output closes before its exit is seen ends the Turn with the exit and closes the Feed without a failure', async () => {
  const agent = createScriptedAgentProcess(scenarios['exit-with-stderr']);

  const host = await startAcpEngine({
    ...scenarios['exit-with-stderr'],
    launchProcess: async (launch) => {
      const process = await agent.launchProcess(launch);

      return {
        ...process,
        // The output closes now; the exit is seen only later.
        exited: process.exited.then(() => {
          agent.processes.at(-1)?.disconnect();

          return new Promise((resolve) => setTimeout(resolve, lateExitMs));
        }),
      };
    },
  });

  const session = await host.caller.session.new(emptySessionInput);
  const events = await host.caller.feed.subscribe({ ...session, after: null });
  await host.caller.session.prompt({
    ...session,
    prompt: [{ type: 'text', text: 'First' }],
  });
  let closed: unknown;

  for await (const event of events)
    if (event.type === 'closed') {
      closed = event;
      break;
    }

  expect(closed).toEqual({ type: 'closed', failure: null });
  const page = await host.caller.feed.page({ ...session, direction: 'tail' });
  expect(page.rows).toContainEqual(
    expect.objectContaining({ sessionUpdate: 'notice', title: exitTitle }),
  );
});
