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
  proposedPlan,
} from '@repo/mocks/agent/plan-proposal-scenario';
import { describe, expect, it } from 'vitest';
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

// Each prompt plays the next response: first the Plan proposal, then a reply.
const startPlanningSession = async (
  agent: string,
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
          { steps: [...planProposalSteps(answers), reply], requests: prompts },
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
      row.toolCallId === 'exit-plan',
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
});
