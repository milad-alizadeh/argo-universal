import type { ResumeSessionRequest } from '@agentclientprotocol/sdk';
import type { AgentOptionsUpdate } from '@repo/contracts';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import { closeTestSession } from '#mocks/close-session';
import { configuration } from './restore.test.mocks';

async function firstUpdate(
  updates: AsyncIterable<AgentOptionsUpdate>,
): Promise<AgentOptionsUpdate> {
  const stream = updates[Symbol.asyncIterator]();
  const next = await stream.next();
  await stream.return?.();

  if (next.done) throw new Error('Agent options ended before an update');

  return next.value;
}

/*
 * A Session reopened after a restart has no options of its own until its Agent session resumes. Its Composer shows the
 * Agent's saved options with the Session's own choices meanwhile, not an empty menu.
 */
it('offers a reopened Session its saved options and choices while its Agent session resumes', async () => {
  const resuming = Promise.withResolvers<ResumeSessionRequest>();
  const release = Promise.withResolvers<void>();

  const host = await startAcpEngine({
    steps: [],
    configOptions: configuration,
    responses: {
      'session/resume': [
        {
          received: resuming,
          waitFor: release.promise,
          result: { configOptions: configuration },
        },
      ],
    },
  });

  const created = await host.caller.session.new({
    ...emptySessionInput,
    prompt: [{ type: 'text', text: 'First' }],
  });

  await waitForAcpSessionIdle(host, created.sessionId);
  await host.caller.session.setConfigOption({
    ...created,
    configId: 'model',
    type: 'id',
    value: 'small',
  });
  await closeTestSession(host, created);
  const opening = host.caller.session.open(created);
  await resuming.promise;

  const update = await firstUpdate(
    await host.caller.session.agentOptions({
      agent: emptySessionInput.agent,
      projectId: emptySessionInput.projectId,
      ...created,
    }),
  );

  expect(update.configOptions).toContainEqual(
    expect.objectContaining({ configId: 'model', currentValue: 'small' }),
  );
  release.resolve();
  await opening;
});
