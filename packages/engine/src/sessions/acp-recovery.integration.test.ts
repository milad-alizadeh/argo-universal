import type {
  PromptRequest,
  NewSessionRequest,
  SetSessionConfigOptionRequest,
  ResumeSessionRequest,
} from '@agentclientprotocol/sdk';
import type { SessionSnapshot } from '@repo/contracts';
import { acpConfiguration } from '@repo/mocks/agent/acp-configuration';
import { appFixtureAgentIds } from '@repo/mocks/agent/app-fixtures';
import { acpPermission } from '@repo/mocks/agent/permission-scenario';
import { describe, expect, it, vi } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle, waitForAcpSnapshot } from '#mocks/acp-feed';
import {
  createScriptedAgentProcess,
  requireScriptedProcessAt,
} from '#mocks/scripted-agent';

const hasRestoredMode = (snapshot: SessionSnapshot): boolean =>
  snapshot.configOptions.some(
    (option) => option.configId === 'mode' && option.currentValue === 'plan',
  );

describe.each(appFixtureAgentIds)('%s ACP lifecycle', (agentId) => {
  const sessionInput = { ...emptySessionInput, agent: agentId };
  type AcpHost = Awaited<ReturnType<typeof startAcpEngine>>;
  const recoveryTimeout = { timeout: 10_000 };
  const waitForGeneration = async (
    host: AcpHost,
    sessionId: string,
    generation: number,
  ): Promise<void> => {
    await expect
      .poll(() => host.agent.processes.length, recoveryTimeout)
      .toBe(generation);
    await waitForAcpSessionIdle(host, sessionId);
  };
  const readClosureFailure = async (
    host: AcpHost,
    sessionId: string,
  ): Promise<string | null> => {
    const events = await host.caller.feed.subscribe({ sessionId, after: null });
    for await (const event of events)
      if (event.type === 'closed') return event.failure;
    throw new Error('The Feed ended without a closure result');
  };
  const readTurn = (host: AcpHost, sessionId: string): unknown =>
    host.database.$client
      .prepare(
        'SELECT stop_reason AS stopReason, error FROM turn WHERE session_id = ?',
      )
      .get(sessionId);
  const pageRows = async (
    host: AcpHost,
    sessionId: string,
  ): Promise<Awaited<ReturnType<AcpHost['caller']['feed']['page']>>['rows']> =>
    (await host.caller.feed.page({ sessionId, direction: 'tail' })).rows;

  type Recorded = {
    prompts: PromptRequest[];
    resumes: ResumeSessionRequest[];
  };
  // Breaks the connection while a Turn waits on its prompt, then waits for recovery.
  const interruptTurn = async (): Promise<
    Recorded & { host: AcpHost; sessionId: string }
  > => {
    const recorded: Recorded = { prompts: [], resumes: [] };
    const host = await startAcpEngine(
      {
        steps: [{ type: 'hold' }],
        responses: {
          'session/prompt': [
            { requests: recorded.prompts, steps: [{ type: 'hold' }] },
          ],
          'session/resume': [{ requests: recorded.resumes }],
        },
      },
      undefined,
      agentId,
    );
    const created = await host.caller.session.new(sessionInput);
    await host.caller.session.prompt({
      ...created,
      prompt: [{ type: 'text', text: 'Work' }],
    });
    await expect.poll(() => recorded.prompts).toHaveLength(1);
    requireScriptedProcessAt(host.agent.processes).disconnect();
    await waitForGeneration(host, created.sessionId, 2);
    return { ...recorded, host, sessionId: created.sessionId };
  };

  it(
    'a connection failure during a Turn records the Turn as interrupted',
    recoveryTimeout,
    async () => {
      const { host, sessionId } = await interruptTurn();
      expect(readTurn(host, sessionId)).toEqual({
        stopReason: 'error',
        error: expect.stringContaining('interrupted'),
      });
    },
  );

  it(
    'an interrupted Turn is resumed without resending its prompt',
    recoveryTimeout,
    async () => {
      const { prompts, resumes } = await interruptTurn();
      expect({
        prompts: prompts.length,
        resumed: resumes.map((resume) => resume.sessionId),
      }).toEqual({ prompts: 1, resumed: [prompts[0]?.sessionId] });
    },
  );

  it(
    'an interrupted Turn discloses that its output may be missing',
    recoveryTimeout,
    async () => {
      const { host, sessionId } = await interruptTurn();
      expect(await pageRows(host, sessionId)).toContainEqual(
        expect.objectContaining({
          sessionUpdate: 'notice',
          description: expect.stringContaining('may be missing'),
        }),
      );
    },
  );

  it(
    'Sessions sharing a failed connection recover through one replacement',
    recoveryTimeout,
    async () => {
      const host = await startAcpEngine({ steps: [] }, undefined, agentId);
      const first = await host.caller.session.new(sessionInput);
      const second = await host.caller.session.new(sessionInput);
      requireScriptedProcessAt(host.agent.processes).disconnect();
      await waitForGeneration(host, first.sessionId, 2);
      await waitForGeneration(host, second.sessionId, 2);
      expect(host.agent.processes).toHaveLength(2);
    },
  );

  it(
    'an Empty Session recreates its Agent session on the same Checkout with selected configuration',
    recoveryTimeout,
    async () => {
      const openings: NewSessionRequest[] = [];
      const prompts: PromptRequest[] = [];
      const host = await startAcpEngine(
        {
          steps: [],
          configOptions: acpConfiguration,
          responses: {
            'session/new': [{ requests: openings }],
            'session/resume': [
              { error: 'Empty Agent session is not persisted' },
            ],
            'session/prompt': [{ requests: prompts }],
          },
        },
        undefined,
        agentId,
      );
      const created = await host.caller.session.new({
        ...sessionInput,
        checkout: { type: 'worktree', baseBranch: 'main' },
        configOptions: [
          { configId: 'mode', value: 'plan' },
          { configId: 'fast', value: true },
        ],
      });
      requireScriptedProcessAt(host.agent.processes).disconnect();
      await expect.poll(() => openings.length, recoveryTimeout).toBe(2);
      await expect
        .poll(async () => {
          try {
            await host.caller.session.prompt({
              ...created,
              prompt: [{ type: 'text', text: 'First work' }],
            });
            return true;
          } catch {
            return false;
          }
        }, recoveryTimeout)
        .toBe(true);
      await waitForAcpSessionIdle(host, created.sessionId);
      const snapshot = await waitForAcpSnapshot(
        host,
        created.sessionId,
        () => true,
      );
      expect({
        openings,
        prompts: prompts.map(({ sessionId }) => sessionId),
        options: snapshot.configOptions,
      }).toMatchObject({
        openings: [{ cwd: expect.any(String) }, { cwd: openings[0]?.cwd }],
        prompts: ['owned-2'],
        options: [
          { configId: 'model' },
          { configId: 'effort' },
          { configId: 'mode', currentValue: 'plan' },
          { configId: 'fast', currentValue: true },
        ],
      });
    },
  );

  it(
    'an Empty Session retries failed configuration restoration without admitting work or losing its selected values',
    recoveryTimeout,
    async () => {
      const selected = acpConfiguration.map((option) =>
        option.id === 'mode' && option.type === 'select'
          ? { ...option, currentValue: 'plan' }
          : option,
      );
      const started = Promise.withResolvers<SetSessionConfigOptionRequest>();
      const finish = Promise.withResolvers<void>();
      const initial = createScriptedAgentProcess({
        steps: [],
        configOptions: selected,
      });
      const replacement = createScriptedAgentProcess({
        steps: [],
        configOptions: acpConfiguration,
        responses: {
          'session/set_config_option': [
            {
              received: started,
              waitFor: finish.promise,
              error: 'Restore failed',
              steps: [
                {
                  type: 'update',
                  update: {
                    sessionUpdate: 'config_option_update',
                    configOptions: acpConfiguration,
                  },
                },
              ],
            },
          ],
        },
      });
      const ready = createScriptedAgentProcess({
        steps: [],
        configOptions: acpConfiguration,
        responses: {
          'session/new': [
            {
              result: {
                sessionId: 'recovered-empty',
                configOptions: acpConfiguration,
              },
            },
          ],
          'session/set_config_option': [
            { result: { configOptions: selected } },
          ],
        },
      });
      let launches = 0;
      // Server start's Readiness check launches first.
      const startupCheck = createScriptedAgentProcess({ steps: [] });
      const peers = [startupCheck, initial, replacement, ready];
      const host = await startAcpEngine(
        {
          steps: [],
          launchProcess: (launch) => {
            const peer = peers[Math.min(launches++, peers.length - 1)];
            if (!peer) throw new Error('No scripted recovery Agent');
            return peer.launchProcess(launch);
          },
        },
        undefined,
        agentId,
      );
      const created = await host.caller.session.new(sessionInput);
      requireScriptedProcessAt(initial.processes).disconnect();
      await started.promise;
      await expect(
        host.caller.session.prompt({
          ...created,
          prompt: [{ type: 'text', text: 'Too early' }],
        }),
      ).rejects.toThrow('session.prompt');
      finish.resolve();
      await expect
        .poll(
          () =>
            host.database.$client
              .prepare('SELECT vendor_session_id FROM session WHERE id = ?')
              .get(created.sessionId),
          recoveryTimeout,
        )
        .toEqual({ vendor_session_id: 'recovered-empty' });
      const snapshot = await waitForAcpSnapshot(
        host,
        created.sessionId,
        hasRestoredMode,
      );
      expect(snapshot.activeTurnId).toBeNull();
      expect(
        (await host.caller.feed.page({ ...created, direction: 'tail' })).rows,
      ).not.toContainEqual(
        expect.objectContaining({ sessionUpdate: 'user_message' }),
      );
      expect(
        host.database.$client
          .prepare('SELECT COUNT(*) AS count FROM turn')
          .get(),
      ).toEqual({ count: 0 });
    },
  );

  it(
    'a failed resume on the replacement retries within the crash budget',
    recoveryTimeout,
    async () => {
      const resumes: ResumeSessionRequest[] = [];
      const host = await startAcpEngine(
        {
          steps: [],
          responses: {
            'session/resume': [
              { requests: resumes, error: 'Resume failed' },
              { requests: resumes },
            ],
          },
        },
        undefined,
        agentId,
      );
      const created = await host.caller.session.new(sessionInput);
      await host.caller.session.prompt({
        ...created,
        prompt: [{ type: 'text', text: 'Persist Agent context' }],
      });
      await waitForAcpSessionIdle(host, created.sessionId);
      requireScriptedProcessAt(host.agent.processes).disconnect();
      await expect.poll(() => resumes.length, recoveryTimeout).toBe(2);
      await waitForAcpSessionIdle(host, created.sessionId);
      expect(await pageRows(host, created.sessionId)).not.toContainEqual(
        expect.objectContaining({
          sessionUpdate: 'notice',
          description: expect.stringContaining('Resume failed'),
        }),
      );
    },
  );

  it(
    'a recovered Session accepts its next prompt on the replacement connection',
    recoveryTimeout,
    async () => {
      const host = await startAcpEngine({ steps: [] }, undefined, agentId);
      const created = await host.caller.session.new(sessionInput);
      requireScriptedProcessAt(host.agent.processes).disconnect();
      await waitForGeneration(host, created.sessionId, 2);
      await host.caller.session.prompt({
        ...created,
        prompt: [{ type: 'text', text: 'Again' }],
      });
      await waitForAcpSessionIdle(host, created.sessionId);
      expect(readTurn(host, created.sessionId)).toMatchObject({
        stopReason: 'end_turn',
      });
    },
  );

  it(
    'an old process that does not exit fails recovery with a concrete outcome',
    recoveryTimeout,
    async () => {
      const host = await startAcpEngine(
        {
          steps: [],
          autoExit: false,
          releaseTimeoutMs: 50,
        },
        undefined,
        agentId,
      );
      const created = await host.caller.session.new(sessionInput);
      requireScriptedProcessAt(host.agent.processes).disconnect();
      const replacement = await vi.waitFor(
        () => requireScriptedProcessAt(host.agent.processes, 1),
        recoveryTimeout,
      );
      await vi.waitFor(() => expect(replacement.terminations).toBe(1));
      replacement.exited.resolve();
      await expect
        .poll(async () => {
          try {
            await host.caller.session.prompt({
              ...created,
              prompt: [{ type: 'text', text: 'Blocked work' }],
            });
            return 'accepted';
          } catch (error) {
            return String(error);
          }
        }, recoveryTimeout)
        .toContain('did not exit');
      await expect(
        host.caller.session.prompt({
          ...created,
          prompt: [{ type: 'text', text: 'Still blocked' }],
        }),
      ).rejects.toThrow('recovery is blocked');
    },
  );

  it(
    'repeated connection failures stop recovery within the existing crash budget',
    recoveryTimeout,
    async () => {
      const host = await startAcpEngine({ steps: [] }, undefined, agentId);
      const created = await host.caller.session.new(sessionInput);
      const closure = readClosureFailure(host, created.sessionId);
      for (const generation of [1, 2]) {
        requireScriptedProcessAt(
          host.agent.processes,
          generation - 1,
        ).disconnect();
        await waitForGeneration(host, created.sessionId, generation + 1);
      }
      requireScriptedProcessAt(host.agent.processes, 2).disconnect();
      expect({
        failure: await closure,
        processes: host.agent.processes.length,
      }).toEqual({
        failure: 'The Agent stopped three times in ten minutes',
        processes: 3,
      });
    },
  );

  it('a reopened Session resumes its Agent context without appending replayed history', async () => {
    const host = await startAcpEngine(
      {
        steps: [],
        responses: {
          'session/resume': [
            {
              steps: [
                {
                  type: 'update',
                  update: {
                    sessionUpdate: 'agent_message_chunk',
                    content: { type: 'text', text: 'Replayed history' },
                  },
                },
              ],
            },
          ],
        },
      },
      undefined,
      agentId,
    );
    const created = await host.caller.session.new(sessionInput);
    await host.caller.session.prompt({
      ...created,
      prompt: [{ type: 'text', text: 'Start' }],
    });
    await waitForAcpSessionIdle(host, created.sessionId);
    await host.caller.session.close(created);
    await host.caller.session.prompt({
      ...created,
      prompt: [{ type: 'text', text: 'Continue' }],
    });
    await waitForAcpSessionIdle(host, created.sessionId);
    expect(
      JSON.stringify(await pageRows(host, created.sessionId)),
    ).not.toContain('Replayed history');
  });

  it(
    'an answer to a question from the failed connection cannot reach the replacement',
    recoveryTimeout,
    async (): Promise<void> => {
      const host = await startAcpEngine(
        {
          steps: [
            {
              type: 'permission',
              request: {
                toolCall: acpPermission.toolCall,
                options: acpPermission.options,
              },
            },
            { type: 'hold' },
          ],
        },
        undefined,
        agentId,
      );
      const created = await host.caller.session.new(sessionInput);
      await host.caller.session.prompt({
        ...created,
        prompt: [{ type: 'text', text: 'Read' }],
      });
      const pending = await waitForAcpSnapshot(
        host,
        created.sessionId,
        (snapshot) => snapshot.pendingPermission !== null,
      );
      const requestId = pending.pendingPermission?.requestId;
      if (requestId === undefined) throw new Error('No pending permission');
      requireScriptedProcessAt(host.agent.processes).disconnect();
      await waitForGeneration(host, created.sessionId, 2);
      await expect(
        host.caller.session.answerPermission({
          ...created,
          requestId,
          optionId: 'read-once',
        }),
      ).rejects.toThrow('already answered');
    },
  );

  it('reopening after an interrupted Turn discloses missing output once', async () => {
    const host = await startAcpEngine({ steps: [] }, undefined, agentId);
    const created = await host.caller.session.new(sessionInput);
    await host.caller.session.prompt({
      ...created,
      prompt: [{ type: 'text', text: 'Start' }],
    });
    await waitForAcpSessionIdle(host, created.sessionId);
    await host.caller.session.close(created);
    const stoppedAt = Date.now();
    host.database.$client
      .prepare(
        `INSERT INTO turn (id, session_id, status, stop_reason, error, started_at, ended_at)
       VALUES ('stopped-turn', ?, 'ended', 'error', ?, ?, ?)`,
      )
      .run(
        created.sessionId,
        JSON.stringify({
          code: 'interrupted',
          message: 'The Server stopped during the Turn',
        }),
        stoppedAt,
        stoppedAt + 1,
      );
    for (const text of ['Continue', 'Again']) {
      await host.caller.session.prompt({
        ...created,
        prompt: [{ type: 'text', text }],
      });
      await waitForAcpSessionIdle(host, created.sessionId);
      await host.caller.session.close(created);
    }
    expect(
      (await pageRows(host, created.sessionId)).filter(
        (row) => row.id === 'stopped-turn:interrupted',
      ),
    ).toEqual([
      expect.objectContaining({
        turnId: 'stopped-turn',
        title: 'Output may be missing',
      }),
    ]);
  });
});
