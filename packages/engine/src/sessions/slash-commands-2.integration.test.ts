import type { NewSessionRequest } from '@agentclientprotocol/sdk';
import type { AgentOptionsUpdate } from '@repo/contracts';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';

const reviewDescription = 'Review changes';

async function closeStream(
  stream: AsyncIterator<AgentOptionsUpdate>,
): Promise<void> {
  await stream.return?.();
}

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
  await closeStream(live);
  await closeStream(discovery);
  await host.caller.session.close(created);

  const saved = (
    await host.caller.session.agentOptions({ ...owner, ...created })
  )[Symbol.asyncIterator]();

  expect((await saved.next()).value).toMatchObject({
    commands: [{ name: 'review', description: reviewDescription }],
  });
  await closeStream(saved);
});
