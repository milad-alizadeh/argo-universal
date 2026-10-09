import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { agentAdapters } from '@repo/agents';
import { createMockAdapter } from '@repo/mocks/agent';
import { expect, it, onTestFinished } from 'vitest';
import { createResourcePeer, resourceLaunch } from '#mocks/acp-resource';
import { openTestDatabase } from '#mocks/database';
import { initTestRepository } from '#mocks/git';
import { startRouterTestHost } from '#mocks/router';
import { createAcpResources } from '../agents';

it.each(agentAdapters.map(({ agent }) => agent))(
  'the public empty %s Session becomes readable without a Turn and awaits closure',
  async (agent) => {
    const directory = mkdtempSync(join(tmpdir(), 'argo-empty-session-'));
    initTestRepository(directory);
    const storage = openTestDatabase({}, directory);
    onTestFinished(() => {
      storage.remove();
      rmSync(directory, { recursive: true, force: true });
    });
    const peer = createResourcePeer();
    const resources = createAcpResources(peer);
    const host = startRouterTestHost({
      database: storage.database,
      runtimeDirectory: storage.directory,
      adapters: [createMockAdapter({}, agent)],
      acpResources: resources,
      resolveAgentLaunch: async (input) => ({
        ...resourceLaunch,
        projectId: input.projectId,
        agentId: input.agent,
        cwd: input.projectPath,
      }),
    });
    const created = await host.caller.session.new({
      projectId: 'project-1',
      agent,
      checkout: { type: 'main' },
      configOptions: [],
      prompt: [],
    });
    const stored = host.context.readSession(created.sessionId);
    expect(stored.agent).toBe(agent);
    const feed = (
      await host.caller.feed.subscribe({
        sessionId: created.sessionId,
        after: null,
      })
    )[Symbol.asyncIterator]();
    const first = await feed.next();
    expect(first.value).toMatchObject({
      type: 'snapshot',
      snapshot: { state: 'idle', activeTurnId: null },
    });
    await feed.return?.();
    expect(peer.processes[0]?.terminations).toBe(0);
    expect(
      await host.caller.session.close({ sessionId: created.sessionId }),
    ).toEqual({});
    expect(peer.processes[0]?.terminations).toBe(1);
  },
);
