import type { NewSessionRequest } from '@agentclientprotocol/sdk';
import type { SlashCommand } from '@repo/contracts';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';

const reviewDescription = 'Review changes';

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
    prompt: [{ type: 'text', text: 'Keep this Session' }],
  });

  const owner = {
    agent: emptySessionInput.agent,
    projectId: emptySessionInput.projectId,
  };

  const discovery = (await host.caller.session.agentOptions(owner))[
    Symbol.asyncIterator
  ]();

  expect((await discovery.next()).value).toMatchObject({ commands: null });
  const refreshing = discovery.next();
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
  expect((await refreshing).value).toMatchObject({
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
