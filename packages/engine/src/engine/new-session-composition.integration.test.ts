import { mkdirSync } from 'node:fs';
import { mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { turn } from '@repo/db/schema';
import type { AgentIdentity } from '@repo/mocks/agent';
import { fixtureAgents } from '@repo/mocks/agent/app-fixtures';
import { scenarios } from '@repo/mocks/agent/scenarios';
import { initTestRepository } from '@repo/mocks/git/test-repository';
import { eq } from 'drizzle-orm';
import { expect, it, onTestFinished } from 'vitest';
import { openTestDatabase } from '#mocks/database';
import { startEngineTestHost } from '#mocks/engine';
import { createScriptedAgentLauncher } from '#mocks/scripted-agent';

async function startNewSessionEngine(identity: AgentIdentity): Promise<
  Awaited<ReturnType<typeof startEngineTestHost>> & {
    project: string;
    database: ReturnType<typeof openTestDatabase>['database'];
  }
> {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'argo-fixture-')));
  onTestFinished((): void => rmSync(root, { recursive: true, force: true }));
  const project = path.join(root, 'project');
  mkdirSync(project);
  await initTestRepository(project);
  const { database, remove } = openTestDatabase({}, project);
  onTestFinished(remove);

  return {
    project,
    ...(await startEngineTestHost({
      database,
      fixtureAgents: [identity],
      acp: {
        launchProcess: createScriptedAgentLauncher(() => scenarios.reply),
      },
    })),
  };
}

it.each(fixtureAgents)(
  'creates a $agent Session and persists its initial prompt and completed Turn with shared fixtures without contacting upstream',
  async (identity): Promise<void> => {
    const root = await startNewSessionEngine(identity);
    const caller = root.createCaller();
    expect(await caller.agent.list()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: identity.agent,
          name: identity.label,
        }),
      ]),
    );

    const { sessionId } = await caller.session.new({
      projectId: 'project-1',
      agent: identity.agent,
      checkout: { type: 'main' },
      configOptions: [],
      prompt: [{ type: 'text', text: 'Initial prompt' }],
    });

    await expect
      .poll(async (): Promise<string | undefined> => {
        const { rows } = await caller.feed.page({
          sessionId,
          direction: 'tail',
        });

        return rows.at(-1)?.sessionUpdate;
      })
      .toBe('notice');
    const { rows } = await caller.feed.page({ sessionId, direction: 'tail' });
    expect(rows).toEqual([
      expect.objectContaining({
        sessionUpdate: 'user_message',
        content: [{ type: 'text', text: 'Initial prompt' }],
      }),
      expect.objectContaining({
        sessionUpdate: 'agent_message',
        state: 'settled',
        content: [
          { type: 'text', text: 'The shared fixture completed this Turn.' },
        ],
      }),
      expect.objectContaining({
        sessionUpdate: 'notice',
        _meta: {
          argo: {
            turnEnd: {
              stopReason: 'end_turn',
              error: null,
              durationMs: expect.any(Number),
            },
          },
        },
      }),
    ]);
    expect(new Set(rows.map((row) => row.turnId)).size).toBe(1);
    expect(
      root.database
        .select()
        .from(turn)
        .where(eq(turn.sessionId, sessionId))
        .all(),
    ).toEqual([
      expect.objectContaining({
        id: rows[0]?.turnId,
        status: 'ended',
        stopReason: 'end_turn',
      }),
    ]);
  },
);
