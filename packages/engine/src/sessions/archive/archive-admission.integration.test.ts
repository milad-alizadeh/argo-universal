import { existsSync } from 'node:fs';
import type {
  CloseSessionRequest,
  PromptRequest,
} from '@agentclientprotocol/sdk';
import { session } from '@repo/db/schema';
import { sessionBranch } from '@repo/git';
import { scriptedInitialization } from '@repo/mocks/agent/scripted-scenario';
import { eq } from 'drizzle-orm';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import { promptedArchiveSession, archiveProjectPath } from '#mocks/archive';
import { startEngineTestHost } from '#mocks/engine';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';

it('refuses archive while a Turn runs', async () => {
  const received = Promise.withResolvers<PromptRequest>();

  const host = await startAcpEngine({
    steps: [],
    responses: {
      'session/prompt': [{ received, steps: [{ type: 'hold' }] }],
    },
  });

  const created = await host.caller.session.new(emptySessionInput);
  await host.caller.session.prompt({
    ...created,
    prompt: [{ type: 'text', text: 'Run' }],
  });
  await received.promise;
  await expect(host.caller.session.archive(created)).rejects.toMatchObject({
    code: 'CONFLICT',
  });
  expect(
    (await host.caller.session.list({ archived: false })).sessions,
  ).toMatchObject([{ sessionId: created.sessionId, archivedAt: null }]);
});

it.each([
  {
    mode: 'supported',
    capabilities: { close: {}, resume: {} },
    steps: [],
    count: 1,
  },
  { mode: 'unsupported', capabilities: {}, steps: [], count: 0 },
  {
    mode: 'timeout',
    capabilities: { close: {}, resume: {} },
    steps: [{ type: 'hold' as const }],
    count: 1,
  },
])(
  'archive uses $mode Session close without killing a sibling',
  async ({ capabilities, steps, count }) => {
    const closes: CloseSessionRequest[] = [];

    const host = await startAcpEngine({
      steps: [],
      closeTimeoutMs: 50,
      initialize: {
        ...scriptedInitialization,
        agentCapabilities: {
          sessionCapabilities: capabilities,
        },
      },
      responses: {
        'session/close': [
          {
            requests: closes,
            steps,
          },
        ],
      },
    });

    const created = await promptedArchiveSession(host);
    const sibling = await host.caller.session.new(emptySessionInput);
    await host.caller.session.archive({ sessionId: created.sessionId });
    expect(closes).toHaveLength(count);
    expect(requireScriptedProcessAt(host.agent.processes).terminations).toBe(0);
    await host.caller.session.prompt({
      ...sibling,
      prompt: [{ type: 'text', text: 'Sibling still works' }],
    });
    await waitForAcpSessionIdle(host, sibling.sessionId);
    await host.caller.session.unarchive({ sessionId: created.sessionId });
  },
);

it('never removes the main Checkout during normal archive or restart, even when its stored branch looks owned', async () => {
  const host = await startAcpEngine({ steps: [] });
  const created = await promptedArchiveSession(host, { type: 'main' });
  await host.caller.session.close({ sessionId: created.sessionId });
  host.database
    .update(session)
    .set({ checkoutBranch: sessionBranch(created.sessionId) })
    .where(eq(session.id, created.sessionId))
    .run();
  await host.caller.session.archive({ sessionId: created.sessionId });
  await expect
    .poll(
      () => host.openSessions.getSnapshot().context.sessions[created.sessionId],
      { timeout: 7000 },
    )
    .toBeUndefined();
  expect(existsSync(created.path)).toBe(true);
  await expect(
    host.caller.session.unarchive({ sessionId: created.sessionId }),
  ).rejects.toMatchObject({ code: 'CONFLICT' });
  const mainPath = archiveProjectPath(host);
  await host.stop();
  const restarted = await startEngineTestHost({ home: host.home });
  expect(existsSync(mainPath)).toBe(true);
  await restarted.stop();
}, 15000);
