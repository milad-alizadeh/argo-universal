import type { AgentOptionsUpdate } from '@repo/contracts';
import { acpConfiguration } from '@repo/mocks/agent/acp-configuration';
import { slashCommandsUpdate } from '@repo/mocks/agent/slash-commands-update';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';
import { slashCommandsWaitMs } from './discovered-slash-commands';

const owner = {
  agent: emptySessionInput.agent,
  projectId: emptySessionInput.projectId,
};

const deploy = { name: 'deploy', description: 'deploy' };

const review = { name: 'review', description: 'Review changes' };

async function nextWithSlashCommands(
  stream: AsyncIterator<AgentOptionsUpdate>,
): Promise<AgentOptionsUpdate> {
  while (true) {
    const next = await stream.next();

    if (next.done) throw new Error('Discovery ended without Slash commands');

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
  slashCommands: readonly { name: string; description: string }[],
  { agent = owner.agent, delayMs = 0, sessionId = 'owned-1' } = {},
): Promise<AsyncIterator<AgentOptionsUpdate>> {
  const stream = (await host.caller.session.agentOptions({ ...owner, agent }))[
    Symbol.asyncIterator
  ]();

  await nextReady(stream);
  await new Promise((resolve) => setTimeout(resolve, delayMs));
  await requireScriptedProcessAt(
    host.agent.processes,
    host.agent.processes.length - 1,
  ).play([slashCommandsUpdate(slashCommands)], sessionId);

  return stream;
}

it('streams commands an Agent reports after New Session selects it', async () => {
  const host = await startAcpEngine({ steps: [], slashCommandsWaitMs });
  const stream = await discoverWith(host, [review]);

  expect(await nextWithSlashCommands(stream)).toMatchObject({
    commands: [review],
  });
  await stream.return?.();
});

it('streams commands an Agent reports before its options are read with the options', async () => {
  const host = await startAcpEngine({
    steps: [],
    configOptions: acpConfiguration,
    responses: {
      'session/set_config_option': [
        {
          steps: [slashCommandsUpdate([review])],
          result: {
            configOptions: acpConfiguration.map((option) =>
              option.id === 'fast' && option.type === 'boolean'
                ? { ...option, currentValue: true }
                : option,
            ),
          },
        },
      ],
    },
  });

  const stream = (
    await host.caller.session.agentOptions({ ...owner, picks: { fast: true } })
  )[Symbol.asyncIterator]();

  expect(await nextReady(stream)).toMatchObject({ commands: [review] });
  await stream.return?.();
});

it('streams the saved commands first when New Session opens again', async () => {
  const host = await startAcpEngine({ steps: [], slashCommandsWaitMs });
  const first = await discoverWith(host, [review]);
  await nextWithSlashCommands(first);
  await first.return?.();

  const again = (await host.caller.session.agentOptions(owner))[
    Symbol.asyncIterator
  ]();

  expect((await again.next()).value).toMatchObject({ commands: [review] });
  await again.return?.();
});

it('keeps a live Session’s commands when a discovery that started earlier reports others', async () => {
  const host = await startAcpEngine({
    steps: [],
    slashCommandsWaitMs,
    responses: {
      'session/new': [
        { result: { sessionId: 'actual' } },
        { result: { sessionId: 'discovery' } },
      ],
    },
  });

  const created = await host.caller.session.new({
    ...emptySessionInput,
    prompt: [{ type: 'text', text: 'Keep this Session' }],
  });

  const stream = (await host.caller.session.agentOptions(owner))[
    Symbol.asyncIterator
  ]();

  await nextReady(stream);
  const liveReader = new AbortController();

  const live = (
    await host
      .createCaller({ signal: liveReader.signal })
      .session.agentOptions({ ...owner, ...created })
  )[Symbol.asyncIterator]();

  await live.next();
  const reported = nextWithSlashCommands(live);
  const process = requireScriptedProcessAt(host.agent.processes);

  await process.play(
    [slashCommandsUpdate([{ name: 'live', description: 'live' }])],
    'actual',
  );
  await reported;
  await requireScriptedProcessAt(host.agent.processes, 1).play(
    [slashCommandsUpdate([{ name: 'discovered', description: 'discovered' }])],
    'discovery',
  );

  expect((await nextWithSlashCommands(stream)).commands).toEqual([
    { name: 'live', description: 'live' },
  ]);
  liveReader.abort();
  await live.return?.();
  await stream.return?.();
});

it('streams no list for an Agent that reports none', async () => {
  const host = await startAcpEngine({ steps: [], slashCommandsWaitMs });

  const stream = (await host.caller.session.agentOptions(owner))[
    Symbol.asyncIterator
  ]();

  expect(await nextReady(stream)).toMatchObject({ commands: null });
  await stream.return?.();
});

it('streams an empty list an Agent reports', async () => {
  const host = await startAcpEngine({ steps: [], slashCommandsWaitMs });
  const stream = await discoverWith(host, []);

  expect(await nextWithSlashCommands(stream)).toMatchObject({ commands: [] });
  await stream.return?.();
});

it('streams the saved commands first after the Engine restarts', async () => {
  const before = await startAcpEngine({ steps: [], slashCommandsWaitMs });
  const stream = await discoverWith(before, [review]);

  await nextWithSlashCommands(stream);
  await stream.return?.();
  await before.stop();

  const after = await startAcpEngine({
    steps: [],
    restartOver: before.home,
    slashCommandsWaitMs,
  });

  const again = (await after.caller.session.agentOptions(owner))[
    Symbol.asyncIterator
  ]();

  const first = await again.next();

  expect(first.value).toMatchObject({ commands: [review] });
  expect(first.value?.stage).not.toBe('ready');
  await again.return?.();
});

async function startTwoAgents(): Promise<Host> {
  const host = await startAcpEngine({
    steps: [],
    slashCommandsWaitMs,
    otherAgents: ['other'],
  });

  const firstAgentReader = await discoverWith(host, [review]);
  await nextWithSlashCommands(firstAgentReader);
  await firstAgentReader.return?.();

  return host;
}

it('offers another Agent in the Project none of the first Agent’s commands', async () => {
  const host = await startTwoAgents();

  const otherAgentReader = (
    await host.caller.session.agentOptions({ ...owner, agent: 'other' })
  )[Symbol.asyncIterator]();

  expect(await nextReady(otherAgentReader)).toMatchObject({ commands: null });
  await otherAgentReader.return?.();
});

it('keeps an Agent’s saved commands when another Agent in the Project reports its own', async () => {
  const host = await startTwoAgents();

  const otherAgentReader = await discoverWith(host, [deploy], {
    agent: 'other',
    sessionId: 'owned-2',
  });

  await nextWithSlashCommands(otherAgentReader);
  await otherAgentReader.return?.();

  const firstAgentReader = (await host.caller.session.agentOptions(owner))[
    Symbol.asyncIterator
  ]();

  expect((await firstAgentReader.next()).value).toMatchObject({
    commands: [review],
  });
  await firstAgentReader.return?.();
});

// Leaving waits for discovery to wind down, so a wait that ignored the reader would outlast the test's own timeout.
it('stops waiting for a list when the reader leaves', async () => {
  const host = await startAcpEngine({ steps: [], slashCommandsWaitMs });

  const stream = (await host.caller.session.agentOptions(owner))[
    Symbol.asyncIterator
  ]();

  await nextReady(stream);
  await stream.return?.();
  await host.stop();
  expect(await stream.next()).toMatchObject({ done: true });
});

it('saves a list that arrives well after the options were read', async () => {
  const host = await startAcpEngine({ steps: [], slashCommandsWaitMs });
  const stream = await discoverWith(host, [review], { delayMs: 2500 });

  expect(await nextWithSlashCommands(stream)).toMatchObject({
    commands: [review],
  });
  await stream.return?.();

  const again = (await host.caller.session.agentOptions(owner))[
    Symbol.asyncIterator
  ]();

  expect((await again.next()).value).toMatchObject({ commands: [review] });
  await again.return?.();
});
