import { expect, it } from 'vitest';
import { startAcpEngine } from '#mocks/acp-engine';
import { slashCommandsWaitMs } from './discovered-slash-commands';
import {
  deploy,
  discoverWith,
  finish,
  nextReady,
  type Host,
  nextWithSlashCommands,
  owner,
  review,
} from './new-session-slash-commands.test.mocks';

it('streams the saved commands first after the Engine restarts', async () => {
  const before = await startAcpEngine({ steps: [], slashCommandsWaitMs });
  const stream = await discoverWith(before, [review]);

  await nextWithSlashCommands(stream);
  await finish(stream);
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
  await finish(again);
});

async function startTwoAgents(): Promise<Host> {
  const host = await startAcpEngine({
    steps: [],
    slashCommandsWaitMs,
    otherAgents: ['other'],
  });

  const firstAgentReader = await discoverWith(host, [review]);
  await nextWithSlashCommands(firstAgentReader);
  await finish(firstAgentReader);

  return host;
}

it('offers another Agent in the Project none of the first Agent’s commands', async () => {
  const host = await startTwoAgents();

  const otherAgentReader = (
    await host.caller.session.agentOptions({ ...owner, agent: 'other' })
  )[Symbol.asyncIterator]();

  expect(await nextReady(otherAgentReader)).toMatchObject({ commands: null });
  await finish(otherAgentReader);
});

it('keeps an Agent’s saved commands when another Agent in the Project reports its own', async () => {
  const host = await startTwoAgents();

  const otherAgentReader = await discoverWith(host, [deploy], {
    agent: 'other',
    sessionId: 'owned-2',
  });

  await nextWithSlashCommands(otherAgentReader);
  await finish(otherAgentReader);

  const firstAgentReader = (await host.caller.session.agentOptions(owner))[
    Symbol.asyncIterator
  ]();

  expect((await firstAgentReader.next()).value).toMatchObject({
    commands: [review],
  });
  await finish(firstAgentReader);
});

// Leaving waits for discovery to wind down, so a wait that ignored the reader would outlast the test's own timeout.
it('stops waiting for a list when the reader leaves', async () => {
  const host = await startAcpEngine({ steps: [], slashCommandsWaitMs });

  const stream = (await host.caller.session.agentOptions(owner))[
    Symbol.asyncIterator
  ]();

  await nextReady(stream);
  await finish(stream);
  await host.stop();
  expect(await stream.next()).toMatchObject({ done: true });
});

it('saves a list that arrives well after the options were read', async () => {
  const host = await startAcpEngine({ steps: [], slashCommandsWaitMs });
  const stream = await discoverWith(host, [review], { delayMs: 2500 });

  expect(await nextWithSlashCommands(stream)).toMatchObject({
    commands: [review],
  });
  await finish(stream);

  const again = (await host.caller.session.agentOptions(owner))[
    Symbol.asyncIterator
  ]();

  expect((await again.next()).value).toMatchObject({ commands: [review] });
  await finish(again);
});
