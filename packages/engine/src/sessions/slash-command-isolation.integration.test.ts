import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';

it('keeps each live Session’s commands separate from the Agent and Project snapshot', async () => {
  const host = await startAcpEngine({ steps: [] });
  const first = await host.caller.session.new(emptySessionInput);
  const second = await host.caller.session.new(emptySessionInput);
  const reader = new AbortController();

  const owner = {
    agent: emptySessionInput.agent,
    projectId: emptySessionInput.projectId,
  };

  const process = requireScriptedProcessAt(host.agent.processes);
  await process.play(
    [
      {
        type: 'update',
        update: {
          sessionUpdate: 'available_commands_update',
          availableCommands: [
            { name: 'first-only', description: 'Only first' },
          ],
        },
      },
    ],
    'owned-1',
  );
  await process.play(
    [
      {
        type: 'update',
        update: {
          sessionUpdate: 'available_commands_update',
          availableCommands: [
            { name: 'second-only', description: 'Only second' },
          ],
        },
      },
    ],
    'owned-2',
  );

  const stream = (
    await host
      .createCaller({ signal: reader.signal })
      .session.agentOptions({ ...owner, ...first })
  )[Symbol.asyncIterator]();

  try {
    expect((await stream.next()).value?.commands).toEqual([
      { name: 'first-only', description: 'Only first' },
    ]);
  } finally {
    reader.abort();
    await stream.return?.();
  }

  const latest = (await host.caller.session.agentOptions(owner))[
    Symbol.asyncIterator
  ]();

  try {
    expect((await latest.next()).value?.commands).toEqual([
      { name: 'second-only', description: 'Only second' },
    ]);
  } finally {
    await latest.return?.();
  }

  expect(first.sessionId).not.toBe(second.sessionId);
});
