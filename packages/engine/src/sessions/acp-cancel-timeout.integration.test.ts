import { appFixtureAgentIds } from '@repo/mocks/agent/app-fixtures';
import { describe, expect, it } from 'vitest';
import {
  readCancelTurns as readTurns,
  readCancelEnding,
  observeLateCancelUpdate,
  readCancelSibling as readSibling,
  finishCancelSibling as finishSiblingTurn,
} from '#mocks/acp-cancel-observations';
import {
  startIgnoredCancelEngine,
  observeCancelDeadline,
  waitForIgnoredCancelTool,
} from '#mocks/acp-cancel-timeout';
import { emptySessionInput } from '#mocks/acp-engine';
import { waitForAcpSessionIdle, waitForAcpSnapshot } from '#mocks/acp-feed';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';

const prompt = [{ type: 'text' as const, text: 'Run the checks' }];

describe.each(appFixtureAgentIds)('%s ACP cancel deadline', (agentId) => {
  it.each([false, true])(
    'an ignored cancel ends at ten seconds and resumes its context without restarting the Agent (sibling: %s)',
    async (withSibling) => {
      const resumed = Promise.withResolvers<void>();
      const resumeGate = Promise.withResolvers<void>();
      const nextPromptEntered = Promise.withResolvers<void>();
      const nextPromptGate = Promise.withResolvers<void>();

      const fixture = await startIgnoredCancelEngine(agentId, {
        nextPromptGate: {
          entered: nextPromptEntered,
          waitFor: nextPromptGate.promise,
        },
        resume: {
          steps: [
            { type: 'gate', entered: resumed, waitFor: resumeGate.promise },
          ],
        },
      });

      const { host, cancels, closes, resumes, prompts, finishSibling } =
        fixture;

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

      const deadline = await observeCancelDeadline(fixture, stuck.sessionId);
      expect(deadline.before).toEqual({
        turns: [{ status: 'running', stop_reason: null }],
        closes: [],
        resumes: [],
      });
      expect(deadline.rows).toMatchObject([
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
      const committed = await readCancelEnding(host, stuck.sessionId);

      for (const running of [false, true]) {
        if (running) {
          await host.caller.session.prompt({ ...stuck, prompt });
          await nextPromptEntered.promise;
        }

        const late = await observeLateCancelUpdate(
          host,
          stuck.sessionId,
          !running,
        );

        expect(late).toMatchObject({
          changes: [],
          diagnostics: [expect.stringContaining('settled Turn')],
        });
        expect(late.revisionAfter).toBe(late.revisionBefore);
        expect(await readCancelEnding(host, stuck.sessionId)).toEqual(
          committed,
        );
      }

      nextPromptGate.resolve();
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
