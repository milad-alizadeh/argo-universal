import type { AgentOptionsUpdate } from '@repo/contracts';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';

const owner = {
  agent: emptySessionInput.agent,
  projectId: emptySessionInput.projectId,
};

const review = { name: 'review', description: 'Review changes' };

async function nextWithCommands(
  stream: AsyncIterator<AgentOptionsUpdate>,
): Promise<AgentOptionsUpdate> {
  while (true) {
    const next = await stream.next();

    if (next.done) throw new Error('Discovery ended without commands');

    if (next.value.commands !== null) return next.value;
  }
}

async function nextReady(
  stream: AsyncIterator<AgentOptionsUpdate>,
): Promise<AgentOptionsUpdate> {
  while (true) {
    const next = await stream.next();

    if (next.done) throw new Error('Discovery ended before it was ready');

    if (next.value.stage === 'ready') return next.value;
  }
}

type Host = Awaited<ReturnType<typeof startAcpEngine>>;

// An Agent sends its list once the discovery session is open, so play it after the options are ready.
async function discoverWith(
  host: Host,
  commands: readonly { name: string; description: string }[],
): Promise<AsyncIterator<AgentOptionsUpdate>> {
  const stream = (await host.caller.session.agentOptions(owner))[
    Symbol.asyncIterator
  ]();

  await nextReady(stream);
  await requireScriptedProcessAt(host.agent.processes).play(
    [
      {
        type: 'update',
        update: {
          sessionUpdate: 'available_commands_update',
          availableCommands: [...commands],
        },
      },
    ],
    'owned-1',
  );

  return stream;
}

it('streams commands an Agent reports after New Session selects it', async () => {
  const host = await startAcpEngine({ steps: [] });
  const stream = await discoverWith(host, [review]);

  expect(await nextWithCommands(stream)).toMatchObject({ commands: [review] });
  await stream.return?.();
});

it('streams the saved commands first when New Session opens again', async () => {
  const host = await startAcpEngine({ steps: [] });
  const first = await discoverWith(host, [review]);
  await nextWithCommands(first);
  await first.return?.();

  const again = (await host.caller.session.agentOptions(owner))[
    Symbol.asyncIterator
  ]();

  expect((await again.next()).value).toMatchObject({ commands: [review] });
  await again.return?.();
});

it('tells an Agent that reported nothing from an empty list', async () => {
  const silent = await startAcpEngine({ steps: [] });

  const silentStream = (await silent.caller.session.agentOptions(owner))[
    Symbol.asyncIterator
  ]();

  expect(await nextReady(silentStream)).toMatchObject({ commands: null });
  await silentStream.return?.();

  const empty = await startAcpEngine({ steps: [] });
  const emptyStream = await discoverWith(empty, []);

  expect(await nextWithCommands(emptyStream)).toMatchObject({ commands: [] });
  await emptyStream.return?.();
});
