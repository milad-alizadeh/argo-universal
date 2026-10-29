import { scenarios } from '@repo/mocks/agent/scenarios';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSnapshot } from '#mocks/acp-feed';
import { createScriptedAgentProcess } from '#mocks/scripted-agent';

const exitTitle = 'Agent exited with status 17';

const lateExitMs = 100;

const turnStatusQuery =
  'SELECT status, stop_reason FROM turn WHERE session_id = ?';

async function waitForClosed(
  events: AsyncIterable<{ type: string }>,
): Promise<void> {
  for await (const event of events) if (event.type === 'closed') return;
}

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

  await waitForClosed(events);
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
