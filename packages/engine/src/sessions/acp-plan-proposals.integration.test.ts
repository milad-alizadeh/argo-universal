import type {
  PromptRequest,
  RequestPermissionResponse,
} from '@agentclientprotocol/sdk';
import type { PendingPlanProposal, UserMessage } from '@repo/contracts';
import { acpConfiguration } from '@repo/mocks/agent/acp-configuration';
import { appFixtureAgentIds } from '@repo/mocks/agent/app-fixtures';
import {
  planProposalOptions,
  planProposalSteps,
  planToolCallId,
  proposedPlan,
} from '@repo/mocks/agent/plan-proposal-scenario';
import type { ScriptedStep } from '@repo/mocks/agent/scripted-scenario';
import { describe, expect, it, vi } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle, waitForAcpSnapshot } from '#mocks/acp-feed';

type AcpEngine = Awaited<ReturnType<typeof startAcpEngine>>;

type FeedRow = Awaited<
  ReturnType<AcpEngine['caller']['feed']['page']>
>['rows'][number];

const reply = {
  type: 'update',
  update: {
    sessionUpdate: 'agent_message_chunk',
    content: { type: 'text', text: 'Planned.' },
  },
} as const;

const feedback = 'Also update the changelog';

const planPrompt = [{ type: 'text' as const, text: 'Plan the typo fix' }];

const proposeAndReply = (
  answers: RequestPermissionResponse[],
): ScriptedStep[] => [...planProposalSteps({ responses: answers }), reply];

// Each prompt plays the next response: first the planning Turn, then a reply.
const startPlanningSession = async (
  agent: string,
  planningTurn = proposeAndReply,
): Promise<{
  host: AcpEngine;
  sessionId: string;
  answers: RequestPermissionResponse[];
  prompts: PromptRequest[];
}> => {
  const answers: RequestPermissionResponse[] = [];
  const prompts: PromptRequest[] = [];

  const host = await startAcpEngine(
    {
      configOptions: acpConfiguration,
      steps: [reply],
      responses: {
        'session/prompt': [
          { steps: planningTurn(answers), requests: prompts },
          { steps: [reply], requests: prompts },
        ],
      },
    },
    undefined,
    agent,
  );

  const { sessionId } = await host.caller.session.new({
    ...emptySessionInput,
    agent,
  });

  await host.caller.session.prompt({ sessionId, prompt: planPrompt });

  return { host, sessionId, answers, prompts };
};

const waitForPlanProposal = async (
  host: AcpEngine,
  sessionId: string,
): Promise<PendingPlanProposal> => {
  const snapshot = await waitForAcpSnapshot(
    host,
    sessionId,
    (candidate) => candidate.pendingPlanProposal !== null,
  );

  if (!snapshot.pendingPlanProposal) throw new Error('No Plan proposal');

  return snapshot.pendingPlanProposal;
};

const cancelled = { outcome: { outcome: 'cancelled' } };

const editToolCall = { toolCallId: 'tool-a', title: 'Edit README.md' };

const allowEdit = {
  optionId: 'allow-edit',
  name: 'Allow',
  kind: 'allow_once',
} as const;

const readUserMessages = async (
  host: AcpEngine,
  sessionId: string,
): Promise<UserMessage['content'][]> =>
  (
    await host.caller.feed.page({ sessionId, direction: 'tail', limit: 40 })
  ).rows.flatMap((row) =>
    row.sessionUpdate === 'user_message' ? [row.content] : [],
  );

const readPlanToolCall = async (
  host: AcpEngine,
  sessionId: string,
): Promise<FeedRow | undefined> =>
  (
    await host.caller.feed.page({ sessionId, direction: 'tail', limit: 40 })
  ).rows.find(
    (row) =>
      row.sessionUpdate === 'tool_call_update' &&
      row.toolCallId === planToolCallId,
  );

describe.each(appFixtureAgentIds)('%s Plan proposals', (agent) => {
  it('holds the plan for an answer: prompts conflict and configuration still applies', async () => {
    const { host, sessionId } = await startPlanningSession(agent);

    const proposal = await waitForPlanProposal(host, sessionId);
    const snapshot = await waitForAcpSnapshot(host, sessionId, () => true);

    expect(proposal).toEqual({
      planId: expect.any(String),
      content: proposedPlan,
    });
    expect(snapshot).toMatchObject({
      state: 'requires_action',
      pendingPermission: null,
      liveHeader: { text: 'Plan ready' },
    });
    await expect(
      host.caller.session.prompt({ sessionId, prompt: planPrompt }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
    await expect(
      host.caller.session.setConfigOption({
        sessionId,
        configId: 'fast',
        type: 'boolean',
        value: true,
      }),
    ).resolves.toMatchObject({
      configOptions: expect.arrayContaining([
        expect.objectContaining({ configId: 'fast', currentValue: true }),
      ]),
    });
  });

  it('Approve allows the plan request and sends no prompt', async () => {
    const { host, sessionId, answers, prompts } =
      await startPlanningSession(agent);

    const { planId } = await waitForPlanProposal(host, sessionId);
    await host.caller.session.answerPlanProposal({
      sessionId,
      planId,
      decision: 'approve',
    });
    await waitForAcpSessionIdle(host, sessionId);

    expect(answers).toEqual([
      {
        outcome: {
          outcome: 'selected',
          optionId: planProposalOptions.approve.optionId,
        },
      },
    ]);
    expect(prompts).toHaveLength(1);
    expect(await readUserMessages(host, sessionId)).toEqual([planPrompt]);
    await expect(
      host.caller.session.answerPlanProposal({
        sessionId,
        planId,
        decision: 'approve',
      }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
    expect(await readPlanToolCall(host, sessionId)).toMatchObject({
      _meta: {
        argo: {
          permissionOutcome: {
            outcome: 'selected',
            ...planProposalOptions.approve,
          },
        },
      },
    });
  });

  it('Keep planning rejects the plan request, then prompts with the feedback as a user message', async () => {
    const { host, sessionId, answers, prompts } =
      await startPlanningSession(agent);

    const { planId } = await waitForPlanProposal(host, sessionId);
    await host.caller.session.answerPlanProposal({
      sessionId,
      planId,
      decision: 'keep_planning',
      feedback,
    });
    await waitForAcpSnapshot(host, sessionId, () => prompts.length === 2);
    await waitForAcpSessionIdle(host, sessionId);

    expect(answers).toEqual([
      {
        outcome: {
          outcome: 'selected',
          optionId: planProposalOptions.keepPlanning.optionId,
        },
      },
    ]);
    expect(prompts[1]?.prompt).toEqual([{ type: 'text', text: feedback }]);
    expect(await readUserMessages(host, sessionId)).toEqual([
      planPrompt,
      [{ type: 'text', text: feedback }],
    ]);
    expect(await readPlanToolCall(host, sessionId)).toMatchObject({
      _meta: {
        argo: {
          permissionOutcome: {
            outcome: 'selected',
            ...planProposalOptions.keepPlanning,
          },
        },
      },
    });
  });

  it.each([
    ['Keep planning without feedback', 'keep_planning', '  '],
    ['Approve with feedback', 'approve', feedback],
  ] as const)('refuses %s', async (_, decision, text) => {
    const { host, sessionId, answers } = await startPlanningSession(agent);

    const { planId } = await waitForPlanProposal(host, sessionId);

    await expect(
      host.caller.session.answerPlanProposal({
        sessionId,
        planId,
        decision,
        feedback: text,
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    expect(answers).toEqual([]);
  });

  it('Stop cancels the Plan proposal and refuses a late answer', async () => {
    const { host, sessionId, answers, prompts } =
      await startPlanningSession(agent);

    const { planId } = await waitForPlanProposal(host, sessionId);
    await host.caller.session.cancel({ sessionId });

    const snapshot = await waitForAcpSnapshot(
      host,
      sessionId,
      (candidate) => candidate.activeTurnId === null,
    );

    expect(snapshot.pendingPlanProposal).toBeNull();
    expect(answers).toEqual([{ outcome: { outcome: 'cancelled' } }]);
    await expect(
      host.caller.session.answerPlanProposal({
        sessionId,
        planId,
        decision: 'keep_planning',
        feedback,
      }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
    expect(prompts).toHaveLength(1);
  });

  it('the Agent withdrawing the plan request cancels the Plan proposal', async () => {
    const withdraw = new AbortController();

    const { host, sessionId } = await startPlanningSession(agent, () => [
      ...planProposalSteps({ signal: withdraw.signal, detached: true }),
      { type: 'hold' },
    ]);

    const { planId } = await waitForPlanProposal(host, sessionId);
    withdraw.abort();

    await waitForAcpSnapshot(
      host,
      sessionId,
      (snapshot) =>
        snapshot.pendingPlanProposal === null && snapshot.state === 'running',
    );
    await expect(
      host.caller.session.answerPlanProposal({
        sessionId,
        planId,
        decision: 'approve',
      }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
    // Closing flushes the Feed rows a held Turn keeps in memory.
    await host.caller.session.close({ sessionId });
    expect(await readPlanToolCall(host, sessionId)).toMatchObject({
      _meta: { argo: { permissionOutcome: { outcome: 'cancelled' } } },
    });
  });

  it('closing the Session cancels its Plan proposal', async () => {
    const { host, sessionId, answers } = await startPlanningSession(
      agent,
      (responses) => [
        ...planProposalSteps({ responses, detached: true }),
        { type: 'hold' },
      ],
    );

    await waitForPlanProposal(host, sessionId);
    await host.caller.session.close({ sessionId });

    await vi.waitFor(() => expect(answers).toEqual([cancelled]));
    expect(await readPlanToolCall(host, sessionId)).toMatchObject({
      _meta: { argo: { permissionOutcome: { outcome: 'cancelled' } } },
    });
  });

  it('refuses a second Plan proposal while one is held', async () => {
    const second: RequestPermissionResponse[] = [];

    const { host, sessionId, answers } = await startPlanningSession(
      agent,
      (responses) => [
        ...planProposalSteps({ responses, detached: true }),
        ...planProposalSteps({ responses: second }),
        { type: 'hold' },
      ],
    );

    await vi.waitFor(() => expect(second).toEqual([cancelled]));

    expect(await waitForPlanProposal(host, sessionId)).toMatchObject({
      content: proposedPlan,
    });
    expect(answers).toEqual([]);
  });

  it('shows a Plan proposal only after the Permission request ahead of it', async () => {
    const { host, sessionId } = await startPlanningSession(agent, () => [
      {
        type: 'permission',
        request: { toolCall: editToolCall, options: [allowEdit] },
        detached: true,
      },
      ...planProposalSteps({ detached: true }),
      { type: 'hold' },
    ]);

    const waiting = await waitForAcpSnapshot(
      host,
      sessionId,
      (snapshot) => snapshot.pendingPermission !== null,
    );

    expect(waiting.pendingPlanProposal).toBeNull();
    await host.caller.session.answerPermission({
      sessionId,
      requestId: waiting.pendingPermission?.requestId ?? '',
      optionId: allowEdit.optionId,
    });
    expect(await waitForPlanProposal(host, sessionId)).toMatchObject({
      content: proposedPlan,
    });
  });

  it('Approve after an earlier Keep planning in the same Turn drops its feedback', async () => {
    const { host, sessionId, prompts } = await startPlanningSession(
      agent,
      (responses) => [
        ...planProposalSteps({ responses }),
        ...planProposalSteps({ responses }),
        reply,
      ],
    );

    const first = await waitForPlanProposal(host, sessionId);
    await host.caller.session.answerPlanProposal({
      sessionId,
      planId: first.planId,
      decision: 'keep_planning',
      feedback,
    });

    const revised = await waitForAcpSnapshot(
      host,
      sessionId,
      (snapshot) =>
        snapshot.pendingPlanProposal !== null &&
        snapshot.pendingPlanProposal.planId !== first.planId,
    );

    await host.caller.session.answerPlanProposal({
      sessionId,
      planId: revised.pendingPlanProposal?.planId ?? '',
      decision: 'approve',
    });
    await waitForAcpSessionIdle(host, sessionId);

    expect(prompts).toHaveLength(1);
    expect(await readUserMessages(host, sessionId)).toEqual([planPrompt]);
  });
});
