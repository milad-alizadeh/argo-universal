import { expect, it } from 'vitest';
import { startAcpEngine } from '#mocks/acp-engine';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';
import { commandsWaitMs } from './discovered-commands';
import {
  commandsUpdate,
  deploy,
  discoverWith,
  finish,
  nextReady,
  nextWithCommands,
  owner,
  review,
} from './new-session-slash-commands.test.mocks';

it('streams the saved commands first after the Engine restarts', async () => {
  const before = await startAcpEngine({ steps: [], commandsWaitMs });
  const stream = await discoverWith(before, [review]);

  await nextWithCommands(stream);
  await finish(stream);
  await before.stop();

  const after = await startAcpEngine({
    steps: [],
    restartOver: before.home,
    commandsWaitMs,
  });

  const again = (await after.caller.session.agentOptions(owner))[
    Symbol.asyncIterator
  ]();

  const first = await again.next();

  expect(first.value).toMatchObject({ commands: [review] });
  expect(first.value?.stage).not.toBe('ready');
  await finish(again);
});

it('keeps each Agent’s commands apart in one Project', async () => {
  const host = await startAcpEngine({ steps: [], commandsWaitMs }, undefined, [
    'mock',
    'other',
  ]);

  const a = await discoverWith(host, [review]);

  await nextWithCommands(a);
  await finish(a);

  const b = (
    await host.caller.session.agentOptions({ ...owner, agent: 'other' })
  )[Symbol.asyncIterator]();

  expect(await nextReady(b)).toMatchObject({ commands: null });
  await requireScriptedProcessAt(host.agent.processes, 1).play(
    commandsUpdate([deploy]),
    'owned-2',
  );
  expect(await nextWithCommands(b)).toMatchObject({ commands: [deploy] });
  await finish(b);

  const again = (await host.caller.session.agentOptions(owner))[
    Symbol.asyncIterator
  ]();

  expect((await again.next()).value).toMatchObject({ commands: [review] });
  await finish(again);
});

// Leaving waits for discovery to wind down, so a wait that ignored the reader would outlast the test's own timeout.
it('stops waiting for a list when the reader leaves', async () => {
  const host = await startAcpEngine({ steps: [], commandsWaitMs });

  const stream = (await host.caller.session.agentOptions(owner))[
    Symbol.asyncIterator
  ]();

  await nextReady(stream);
  await finish(stream);
  await host.stop();
  expect(await stream.next()).toMatchObject({ done: true });
});

it('saves a list that arrives well after the options were read', async () => {
  const host = await startAcpEngine({ steps: [], commandsWaitMs });
  const stream = await discoverWith(host, [review], 2500);

  expect(await nextWithCommands(stream)).toMatchObject({ commands: [review] });
  await finish(stream);

  const again = (await host.caller.session.agentOptions(owner))[
    Symbol.asyncIterator
  ]();

  expect((await again.next()).value).toMatchObject({ commands: [review] });
  await finish(again);
});
