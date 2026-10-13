import type { NewSessionRequest } from '@agentclientprotocol/sdk';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';

it('collective shutdown owns a starting ACP Session until its process exit is observed', async () => {
  const requested = Promise.withResolvers<NewSessionRequest>();
  const host = await startAcpEngine({
    autoExit: false,
    steps: [],
    responses: {
      'session/new': [{ received: requested, steps: [{ type: 'hold' }] }],
    },
  });
  const opening = host.caller.session
    .new(emptySessionInput)
    .catch((error: unknown): unknown => error);
  await requested.promise;
  const process = requireScriptedProcessAt(host.agent.processes);
  let stopped = false;
  const stopping = host.stop().then(() => {
    stopped = true;
  });
  await expect.poll(() => process.terminations).toBe(1);
  expect(stopped).toBe(false);
  expect(host.engine.getSnapshot().status).toBe('active');
  process.exited.resolve();
  await stopping;
  expect(host.engine.getSnapshot().status).toBe('done');
  expect(process.terminations).toBe(1);
  expect(await opening).toBeInstanceOf(Error);
});
