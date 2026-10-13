import { turn } from '@repo/db/schema';
import { appFixtureAgentIds } from '@repo/mocks/agent/app-fixtures';
import { eq, sql } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';
import {
  startIgnoredCancelEngine,
  waitForIgnoredCancelTool,
} from '#mocks/acp-cancel-timeout';
import { emptySessionInput } from '#mocks/acp-engine';
import { waitForAcpSessionIdle, waitForAcpSnapshot } from '#mocks/acp-feed';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';

type Host = Awaited<ReturnType<typeof startIgnoredCancelEngine>>['host'];

const prompt = [{ type: 'text' as const, text: 'Run the checks' }];

const readTurns = (
  host: Host,
  sessionId: string,
): {
  status: (typeof turn.$inferSelect)['status'];
  stop_reason: (typeof turn.$inferSelect)['stopReason'];
}[] =>
  host.database
    .select({ status: turn.status, stop_reason: turn.stopReason })
    .from(turn)
    .where(eq(turn.sessionId, sessionId))
    .orderBy(sql`rowid`)
    .all();

describe.each(appFixtureAgentIds)('%s ACP cancel deadline', (agentId) => {
  it.each([false, true])(
    'an ignored cancel ends at ten seconds and resumes its context without restarting the Agent (sibling: %s)',
    async (withSibling) => {
      const resumed = Promise.withResolvers<void>();
      const resumeGate = Promise.withResolvers<void>();

      const fixture = await startIgnoredCancelEngine(agentId, {
        resume: {
          steps: [
            { type: 'gate', entered: resumed, waitFor: resumeGate.promise },
          ],
        },
      });

      const {
        host,
        cancels,
        closes,
        resumes,
        prompts,
        cancelled,
        finishSibling,
      } = fixture;

      const sessionInput = { ...emptySessionInput, agent: agentId };
      const stuck = await host.caller.session.new(sessionInput);
      await host.caller.session.prompt({ ...stuck, prompt });
      await waitForIgnoredCancelTool(host, stuck.sessionId);

      const sibling = withSibling
        ? await host.caller.session.new({
            ...sessionInput,
            checkout: { type: 'worktree', baseBranch: 'main' },
            prompt,
          })
        : null;

      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

      try {
        await host.caller.session.cancel(stuck);
        await cancelled.promise;
        await vi.advanceTimersByTimeAsync(9_999);
        expect({
          turns: readTurns(host, stuck.sessionId),
          closes,
          resumes,
        }).toEqual({
          turns: [{ status: 'running', stop_reason: null }],
          closes: [],
          resumes: [],
        });
        await vi.advanceTimersByTimeAsync(1);

        const page = await host.caller.feed.page({
          ...stuck,
          direction: 'tail',
        });

        expect(page.rows).toMatchObject([
          { sessionUpdate: 'user_message' },
          {
            sessionUpdate: 'tool_call_update',
            state: 'settled',
            status: 'cancelled',
          },
          {
            sessionUpdate: 'notice',
            title: 'The Agent did not stop after cancellation',
          },
        ]);
      } finally {
        vi.useRealTimers();
      }

      await resumed.promise;
      expect(
        await waitForAcpSnapshot(host, stuck.sessionId, () => true),
      ).toMatchObject({
        state: 'running',
        activeTurnId: null,
        liveHeader: null,
      });
      await expect(
        host.caller.session.prompt({ ...stuck, prompt }),
      ).rejects.toThrow('cannot accept session.prompt');
      resumeGate.resolve();
      await waitForAcpSessionIdle(host, stuck.sessionId);
      expect(
        await waitForAcpSnapshot(host, stuck.sessionId, () => true),
      ).toMatchObject({ state: 'idle', activeTurnId: null, liveHeader: null });
      expect({
        cancels,
        closes,
        resumed: resumes.map((request) => request.sessionId),
        processes: host.agent.processes.length,
        terminations: requireScriptedProcessAt(host.agent.processes)
          .terminations,
        turns: readTurns(host, stuck.sessionId),
      }).toEqual({
        cancels: [{ sessionId: 'owned-1' }],
        closes: [{ sessionId: 'owned-1' }],
        resumed: ['owned-1'],
        processes: 1,
        terminations: 0,
        turns: [{ status: 'ended', stop_reason: 'cancelled' }],
      });
      await host.caller.session.prompt({ ...stuck, prompt });
      await waitForAcpSessionIdle(host, stuck.sessionId);
      const page = await host.caller.feed.page({ ...stuck, direction: 'tail' });
      expect(page.rows.at(-1)).toMatchObject({
        sessionUpdate: 'agent_message',
        content: [{ text: 'Context retained' }],
      });
      expect(
        prompts.filter((request) => request.sessionId === 'owned-1'),
      ).toHaveLength(2);
      expect(await readSibling(host, sibling?.sessionId)).toEqual(
        withSibling ? 'running' : null,
      );
      finishSibling.resolve();
      await finishSiblingTurn(host, sibling?.sessionId);
    },
  );
});

const readSibling = async (
  host: Host,
  sessionId?: string,
): Promise<'idle' | 'running' | 'requires_action' | null> =>
  sessionId
    ? (await waitForAcpSnapshot(host, sessionId, () => true)).state
    : null;

const finishSiblingTurn = async (
  host: Host,
  sessionId?: string,
): Promise<void> => {
  if (sessionId) await waitForAcpSessionIdle(host, sessionId);
};
