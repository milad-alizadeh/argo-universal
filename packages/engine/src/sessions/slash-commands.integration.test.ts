import type {
  NewSessionRequest,
  ResumeSessionRequest,
} from '@agentclientprotocol/sdk';
import type { AgentOptionsUpdate, SlashCommand } from '@repo/contracts';
import { slashCommandsUpdate } from '@repo/mocks/agent/slash-commands-update';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';

const reviewDescription = 'Review changes';

const keptPrompt = [{ type: 'text' as const, text: 'Keep this Session' }];

const reviewCommandUpdate = [
  slashCommandsUpdate([{ name: 'review', description: reviewDescription }]),
];

it('streams a live Session’s commands and replaces them after another update', async () => {
  const host = await startAcpEngine({ steps: [] });
  const created = await host.caller.session.new(emptySessionInput);
  const reader = new AbortController();

  const stream = (
    await host.createCaller({ signal: reader.signal }).session.agentOptions({
      agent: emptySessionInput.agent,
      projectId: emptySessionInput.projectId,
      ...created,
    })
  )[Symbol.asyncIterator]();

  const nextCommands = async (): Promise<SlashCommand[]> => {
    while (true) {
      const next = await stream.next();

      if (next.done)
        throw new Error('Agent options stopped before commands arrived');

      if ('commands' in next.value && next.value.commands !== null)
        return next.value.commands;
    }
  };

  const process = requireScriptedProcessAt(host.agent.processes);
  const commands = nextCommands();
  await process.play(
    [
      {
        type: 'update',
        update: {
          sessionUpdate: 'available_commands_update',
          availableCommands: [
            {
              name: 'review',
              description: reviewDescription,
              input: { hint: 'files' },
            },
          ],
        },
      },
    ],
    'owned-1',
  );
  expect(await commands).toEqual([
    { name: 'review', description: reviewDescription, hint: 'files' },
  ]);
  const replacement = nextCommands();
  await process.play(
    [
      {
        type: 'update',
        update: {
          sessionUpdate: 'available_commands_update',
          availableCommands: [],
        },
      },
    ],
    'owned-1',
  );
  expect(await replacement).toEqual([]);
  reader.abort();
  await stream.return?.();
});

it('streams the saved commands for a resumed Session before its Agent reports any', async () => {
  const host = await startAcpEngine({ steps: [] });

  const created = await host.caller.session.new({
    ...emptySessionInput,
    prompt: keptPrompt,
  });

  await requireScriptedProcessAt(host.agent.processes).play(
    reviewCommandUpdate,
    'owned-1',
  );
  await host.caller.session.close(created);
  await host.caller.session.prompt({
    ...created,
    prompt: [{ type: 'text', text: 'Resume this Session' }],
  });
  const reader = new AbortController();

  const stream = (
    await host.createCaller({ signal: reader.signal }).session.agentOptions({
      agent: emptySessionInput.agent,
      projectId: emptySessionInput.projectId,
      ...created,
    })
  )[Symbol.asyncIterator]();

  expect((await stream.next()).value).toMatchObject({
    commands: [{ name: 'review', description: reviewDescription }],
  });
  reader.abort();
  await stream.return?.();
});

it('retains live commands while a discovery that started earlier finishes', async () => {
  const received = Promise.withResolvers<NewSessionRequest>();
  const release = Promise.withResolvers<void>();

  const host = await startAcpEngine({
    steps: [],
    responses: {
      'session/new': [
        { result: { sessionId: 'actual' } },
        {
          received,
          waitFor: release.promise,
          result: { sessionId: 'discovery' },
        },
      ],
    },
  });

  const created = await host.caller.session.new({
    ...emptySessionInput,
    prompt: keptPrompt,
  });

  const owner = {
    agent: emptySessionInput.agent,
    projectId: emptySessionInput.projectId,
  };

  const discovery = (await host.caller.session.agentOptions(owner))[
    Symbol.asyncIterator
  ]();

  expect((await discovery.next()).value).toMatchObject({ commands: null });
  const refreshing = nextReady(discovery);
  await received.promise;
  const liveReader = new AbortController();

  const live = (
    await host
      .createCaller({ signal: liveReader.signal })
      .session.agentOptions({ ...owner, ...created })
  )[Symbol.asyncIterator]();

  await live.next();
  const updated = live.next();
  await requireScriptedProcessAt(host.agent.processes).play(
    [
      {
        type: 'update',
        update: {
          sessionUpdate: 'available_commands_update',
          availableCommands: [
            { name: 'review', description: reviewDescription },
          ],
        },
      },
    ],
    'actual',
  );
  expect((await updated).value).toMatchObject({
    commands: [{ name: 'review', description: reviewDescription }],
  });
  release.resolve();
  expect(await refreshing).toMatchObject({
    commands: [{ name: 'review', description: reviewDescription }],
  });
  liveReader.abort();
  await live.return?.();
  await discovery.return?.();
  await host.caller.session.close(created);

  const saved = (
    await host.caller.session.agentOptions({ ...owner, ...created })
  )[Symbol.asyncIterator]();

  expect((await saved.next()).value).toMatchObject({
    commands: [{ name: 'review', description: reviewDescription }],
  });
  await saved.return?.();
});

it.each(['ready', 'discovering'])(
  'keeps the same options reader live when a closed Session resumes while %s',
  async (stage) => {
    const resumed = Promise.withResolvers<ResumeSessionRequest>();
    const discovering = Promise.withResolvers<NewSessionRequest>();
    const release = Promise.withResolvers<void>();
    const ready = Promise.withResolvers<void>();

    const host = await startAcpEngine({
      steps: [],
      responses: {
        'session/new': [
          { result: { sessionId: 'actual' } },
          {
            received: discovering,
            waitFor: release.promise,
            result: { sessionId: 'discovery' },
          },
        ],
        'session/resume': [{ received: resumed }],
      },
    });

    const created = await host.caller.session.new({
      ...emptySessionInput,
      prompt: keptPrompt,
    });

    await host.caller.session.close(created);
    const reader = new AbortController();

    const stream = (
      await host.createCaller({ signal: reader.signal }).session.agentOptions({
        ...created,
        agent: emptySessionInput.agent,
        projectId: emptySessionInput.projectId,
      })
    )[Symbol.asyncIterator]();

    expect((await stream.next()).value).toMatchObject({ commands: null });

    const commands = (async (): Promise<SlashCommand[]> => {
      while (true) {
        const update = await stream.next();

        if (update.done)
          throw new Error('Options reader ended before Session resumed');

        if (update.value.stage === 'ready') ready.resolve();

        if (update.value.commands !== null) return update.value.commands;
      }
    })();

    // Keep a failure handled while the scripted resume is still being driven.
    void commands.catch(() => {});
    await discovering.promise;

    if (stage === 'ready') {
      release.resolve();
      await ready.promise;
    }

    await host.caller.session.prompt({
      ...created,
      prompt: [{ type: 'text', text: 'Resume this Session' }],
    });
    const request = await resumed.promise;

    await requireScriptedProcessAt(
      host.agent.processes,
      host.agent.processes.length - 1,
    ).play(
      [
        {
          type: 'update',
          update: {
            sessionUpdate: 'available_commands_update',
            availableCommands: [
              { name: 'review', description: reviewDescription },
            ],
          },
        },
      ],
      request.sessionId,
    );
    expect(await commands).toEqual([
      { name: 'review', description: reviewDescription },
    ]);
    release.resolve();
    reader.abort();
    await stream.return?.();
  },
);

async function nextReady(
  stream: AsyncIterator<AgentOptionsUpdate>,
): Promise<AgentOptionsUpdate> {
  let next;

  do {
    next = await stream.next();

    if (next.done) throw new Error('Discovery ended before its ready update');
  } while (next.value.stage !== 'ready');

  return next.value;
}
