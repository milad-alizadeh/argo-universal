import { existsSync } from 'node:fs';
import type {
  NewSessionRequest,
  PromptRequest,
} from '@agentclientprotocol/sdk';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';

const prompt = [{ type: 'text' as const, text: 'Start' }];

it('a Session whose close timed out keeps its Checkout and refuses work until its shared process exit is observed', async () => {
  const openings: NewSessionRequest[] = [];
  const host = await startAcpEngine({
    steps: [],
    autoExit: false,
    closeTimeoutMs: 50,
    responses: {
      'session/new': [{ requests: openings }],
      'session/close': [
        { sessionId: 'owned-1', steps: [{ type: 'hold' }] },
        { sessionId: 'owned-2', result: {} },
      ],
    },
  });
  const stuck = await host.caller.session.new({
    ...emptySessionInput,
    checkout: { type: 'worktree', baseBranch: 'main' },
  });
  const sibling = await host.caller.session.new(emptySessionInput);
  await expect(host.caller.session.close(stuck)).rejects.toThrow(
    'ACP session close timed out; cleanup retained',
  );
  await host.caller.session.prompt({ ...sibling, prompt });
  await waitForAcpSessionIdle(host, sibling.sessionId);
  const process = requireScriptedProcessAt(host.agent.processes);
  const retained = {
    checkout: existsSync(openings[0]?.cwd ?? ''),
    terminations: process.terminations,
  };
  const siblingClosing = host.caller.session.close(sibling);
  await expect.poll(() => process.terminations).toBe(1);
  await expect(
    host.caller.session.prompt({ ...stuck, prompt }),
  ).rejects.toThrow('cannot accept session.prompt');
  process.exited.resolve();
  await siblingClosing;
  await expect
    .poll(() =>
      host.caller.session.prompt({ ...stuck, prompt }).then(
        () => 'accepted',
        (error: unknown) => String(error),
      ),
    )
    .toBe('accepted');
  expect(retained).toEqual({ checkout: true, terminations: 0 });
});

it('Engine shutdown during a running Turn terminates its ACP process once and waits for its observed exit', async () => {
  const received = Promise.withResolvers<PromptRequest>();
  const host = await startAcpEngine({
    autoExit: false,
    steps: [{ type: 'hold' }],
    responses: { 'session/prompt': [{ received, steps: [{ type: 'hold' }] }] },
  });
  const { sessionId } = await host.caller.session.new(emptySessionInput);
  await host.caller.session.prompt({ sessionId, prompt });
  await received.promise;
  const process = requireScriptedProcessAt(host.agent.processes);
  let stopped = false;
  const stopping = host.stop().then(() => {
    stopped = true;
  });
  await expect.poll(() => process.terminations).toBe(1);
  const beforeExit = { stopped };
  process.exited.resolve();
  await stopping;
  expect({ beforeExit, terminations: process.terminations }).toEqual({
    beforeExit: { stopped: false },
    terminations: 1,
  });
});
