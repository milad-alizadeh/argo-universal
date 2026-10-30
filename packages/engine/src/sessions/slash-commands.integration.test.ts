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

async function nextUpdate(
  stream: AsyncIterator<AgentOptionsUpdate>,
): Promise<AgentOptionsUpdate> {
  const next = await stream.next();

  if (next.done)
    throw new Error('Agent options stopped before commands arrived');

  return next.value;
}

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
      const update = await nextUpdate(stream);
      const commands = update.commands;

      if (commands !== null) return commands;
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
