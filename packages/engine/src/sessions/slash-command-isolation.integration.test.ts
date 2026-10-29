import type { AgentOptionsUpdate } from '@repo/contracts';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';

const readCommands = async (
  stream: AsyncIterator<AgentOptionsUpdate>,
): Promise<AgentOptionsUpdate['commands'] | undefined> =>
  (await stream.next()).value?.commands;

async function closeStream(
  stream: AsyncIterator<AgentOptionsUpdate>,
): Promise<void> {
  await stream.return?.();
}

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
  await requireScriptedProcessAt(host.agent.processes, 1).play(
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
    expect(await readCommands(stream)).toEqual([
      { name: 'first-only', description: 'Only first' },
    ]);
  } finally {
    reader.abort();
    await closeStream(stream);
  }

  const latest = (await host.caller.session.agentOptions(owner))[
    Symbol.asyncIterator
  ]();

  try {
    expect(await readCommands(latest)).toEqual([
      { name: 'second-only', description: 'Only second' },
    ]);
  } finally {
    await closeStream(latest);
  }

  expect(first.sessionId).not.toBe(second.sessionId);
});
