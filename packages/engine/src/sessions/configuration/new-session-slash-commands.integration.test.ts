import { acpConfiguration } from '@repo/mocks/agent/acp-configuration';
import { slashCommandsUpdate } from '@repo/mocks/agent/slash-commands-update';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';
import { slashCommandsWaitMs } from './discovered-slash-commands';
import {
  discoverWith,
  finish,
  nextReady,
  nextWithSlashCommands,
  owner,
  review,
} from './new-session-slash-commands.test.mocks';

it('streams commands an Agent reports after New Session selects it', async () => {
  const host = await startAcpEngine({ steps: [], slashCommandsWaitMs });
  const stream = await discoverWith(host, [review]);

  expect(await nextWithSlashCommands(stream)).toMatchObject({
    commands: [review],
  });
  await finish(stream);
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
  await finish(stream);
});

it('streams the saved commands first when New Session opens again', async () => {
  const host = await startAcpEngine({ steps: [], slashCommandsWaitMs });
  const first = await discoverWith(host, [review]);
  await nextWithSlashCommands(first);
  await finish(first);

  const again = (await host.caller.session.agentOptions(owner))[
    Symbol.asyncIterator
  ]();

  expect((await again.next()).value).toMatchObject({ commands: [review] });
  await finish(again);
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
  await finish(live);
  await finish(stream);
});

it('streams no list for an Agent that reports none', async () => {
  const host = await startAcpEngine({ steps: [], slashCommandsWaitMs });

  const stream = (await host.caller.session.agentOptions(owner))[
    Symbol.asyncIterator
  ]();

  expect(await nextReady(stream)).toMatchObject({ commands: null });
  await finish(stream);
});

it('streams an empty list an Agent reports', async () => {
  const host = await startAcpEngine({ steps: [], slashCommandsWaitMs });
  const stream = await discoverWith(host, []);

  expect(await nextWithSlashCommands(stream)).toMatchObject({ commands: [] });
  await finish(stream);
});
