import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';
import { commandsWaitMs } from './discovered-commands';
import {
  commandsUpdate,
  discoverWith,
  finish,
  nextReady,
  nextWithCommands,
  owner,
  review,
} from './new-session-slash-commands.test.mocks';

it('streams commands an Agent reports after New Session selects it', async () => {
  const host = await startAcpEngine({ steps: [], commandsWaitMs });
  const stream = await discoverWith(host, [review]);

  expect(await nextWithCommands(stream)).toMatchObject({ commands: [review] });
  await finish(stream);
});

it('streams the saved commands first when New Session opens again', async () => {
  const host = await startAcpEngine({ steps: [], commandsWaitMs });
  const first = await discoverWith(host, [review]);
  await nextWithCommands(first);
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
    commandsWaitMs,
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
  const reported = nextWithCommands(live);
  const process = requireScriptedProcessAt(host.agent.processes);

  await process.play(
    commandsUpdate([{ name: 'live', description: 'live' }]),
    'actual',
  );
  await reported;
  await requireScriptedProcessAt(host.agent.processes, 1).play(
    commandsUpdate([{ name: 'discovered', description: 'discovered' }]),
    'discovery',
  );

  expect((await nextWithCommands(stream)).commands).toEqual([
    { name: 'live', description: 'live' },
  ]);
  liveReader.abort();
  await finish(live);
  await finish(stream);
});

it('tells an Agent that reported nothing from an empty list', async () => {
  const silent = await startAcpEngine({ steps: [], commandsWaitMs });

  const silentStream = (await silent.caller.session.agentOptions(owner))[
    Symbol.asyncIterator
  ]();

  expect(await nextReady(silentStream)).toMatchObject({ commands: null });
  await finish(silentStream);

  const empty = await startAcpEngine({ steps: [], commandsWaitMs });
  const emptyStream = await discoverWith(empty, []);

  expect(await nextWithCommands(emptyStream)).toMatchObject({ commands: [] });
  await finish(emptyStream);
});
