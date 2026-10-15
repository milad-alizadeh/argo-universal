import { existsSync } from 'node:fs';
import type { NewSessionRequest } from '@agentclientprotocol/sdk';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';

it('a refused session/new discards its unstored Checkout without killing the shared process', async () => {
  const requested = Promise.withResolvers<NewSessionRequest>();

  const host = await startAcpEngine({
    steps: [],
    responses: {
      'session/new': [{ received: requested, error: 'open refused' }],
    },
  });

  const opening = host.caller.session.new({
    ...emptySessionInput,
    checkout: { type: 'worktree', baseBranch: 'main' },
  });

  const outcome = opening.catch((cause: unknown) => cause);
  const checkout = (await requested.promise).cwd;
  expect(await outcome).toMatchObject({
    message: expect.stringContaining('open refused'),
  });
  expect(existsSync(checkout)).toBe(false);
  expect(requireScriptedProcessAt(host.agent.processes).terminations).toBe(0);
});
