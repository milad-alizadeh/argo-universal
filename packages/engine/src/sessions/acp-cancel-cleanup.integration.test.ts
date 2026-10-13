import { appFixtureAgentIds } from '@repo/mocks/agent/app-fixtures';
import { describe, expect, it, vi } from 'vitest';
import {
  startIgnoredCancelEngine,
  waitForIgnoredCancelTool,
} from '#mocks/acp-cancel-timeout';
import { emptySessionInput } from '#mocks/acp-engine';
import { waitForAcpSnapshot } from '#mocks/acp-feed';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';

const prompt = [{ type: 'text' as const, text: 'Run the checks' }];
describe.each(appFixtureAgentIds)('%s ACP cancel cleanup', (agentId) => {
  it('a failed owned close retains cleanup after the shared five-second deadline', async () => {
    const { host, cancelled, closes, resumes } = await startIgnoredCancelEngine(
      agentId,
      {
        close: { steps: [{ type: 'hold' }] },
        autoExit: false,
      },
    );
    const stuck = await host.caller.session.new({
      ...emptySessionInput,
      agent: agentId,
    });
    await host.caller.session.prompt({ ...stuck, prompt });
    await waitForIgnoredCancelTool(host, stuck.sessionId);
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    try {
      await host.caller.session.cancel(stuck);
      await cancelled.promise;
      await vi.advanceTimersByTimeAsync(10_000);
      await vi.advanceTimersByTimeAsync(4_999);
      await expect(
        host.caller.session.prompt({ ...stuck, prompt }),
      ).rejects.toThrow('cannot accept session.prompt');
      expect({ closes, resumes }).toEqual({
        closes: [{ sessionId: 'owned-1' }],
        resumes: [],
      });
      await vi.advanceTimersByTimeAsync(1);
      await expect(
        host.caller.session.prompt({ ...stuck, prompt }),
      ).rejects.toThrow('ACP session close timed out; cleanup retained');
    } finally {
      vi.useRealTimers();
    }
    const process = requireScriptedProcessAt(host.agent.processes);
    expect({
      processes: host.agent.processes.length,
      terminations: process.terminations,
      resumes,
    }).toEqual({ processes: 1, terminations: 1, resumes: [] });
    process.exited.resolve();
  });

  it.each(['close', 'resume'] as const)(
    'Engine shutdown while replacement waits on %s retains transport until process exit',
    async (stage) => {
      const entered = Promise.withResolvers<void>();
      const gate = Promise.withResolvers<void>();
      const blocked = {
        steps: [{ type: 'gate' as const, entered, waitFor: gate.promise }],
      };
      const { host, cancelled } = await startIgnoredCancelEngine(agentId, {
        [stage]: blocked,
        autoExit: false,
      });
      const stuck = await host.caller.session.new({
        ...emptySessionInput,
        agent: agentId,
      });
      await host.caller.session.prompt({ ...stuck, prompt });
      await waitForIgnoredCancelTool(host, stuck.sessionId);
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      try {
        await host.caller.session.cancel(stuck);
        await cancelled.promise;
        await vi.advanceTimersByTimeAsync(10_000);
        await entered.promise;
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
        const process = requireScriptedProcessAt(host.agent.processes);
        let stopped = false;
        const stopping = host.stop().then(() => {
          stopped = true;
        });
        await vi.advanceTimersByTimeAsync(5_000);
        expect(process.terminations).toBe(1);
        expect(stopped).toBe(false);
        process.exited.resolve();
        gate.resolve();
        await stopping;
        expect({
          stopped,
          processes: host.agent.processes.length,
          terminations: process.terminations,
        }).toEqual({ stopped: true, processes: 1, terminations: 1 });
      } finally {
        vi.useRealTimers();
      }
    },
  );
});
