import { writeFileSync } from 'node:fs';
import {
  applyFeedChange,
  type Feed,
  userMessageChange,
} from '../apps/server/src/services/feed/feed-change.ts';
import { toLiveHeader } from '../apps/server/src/services/sessions/live-header.ts';
import { mockClis } from '../mocks/cli/index.ts';
import { agentAdapters } from '../packages/agents/src/adapters.ts';
import type { RequestAnswer } from '../packages/api/mocks/requests.ts';
import { SessionAnswerElicitationInput } from '../packages/contracts/src/sessions/answer-elicitation.ts';
import { SessionAnswerPermissionInput } from '../packages/contracts/src/sessions/answer-permission.ts';
import { SessionAnswerPlanProposalInput } from '../packages/contracts/src/sessions/answer-plan-proposal.ts';
import {
  type PendingElicitation,
  type PendingPermission,
  type PendingPlanProposal,
  SessionSnapshot,
} from '../packages/contracts/src/sessions/snapshot.ts';

const recordings = [
  'permission',
  'elicitation',
  'plan-approved',
  'plan-kept-planning',
];
const startedAt = Date.UTC(2026, 9, 6, 9);

const mocks = agentAdapters.flatMap(({ agent }, index) => {
  const cli = mockClis[agent];
  if (!cli) throw new Error('Missing Agent mock');
  return recordings.map((recording) => {
    const sessionId = `agent-${index + 1}-${recording}`;
    const recordedAnswer = cli.recordedRequestAnswer(recording);
    let feed: Feed = { sessionId, maxRevision: 0, nextPosition: 0, rows: {} };
    let turnId: string | null = 'turn-1';
    let pendingPermission: PendingPermission | null = null;
    let pendingElicitation: PendingElicitation | null = null;
    let pendingPlanProposal: PendingPlanProposal | null = null;
    const apply = (change: Parameters<typeof applyFeedChange>[1]) => {
      const result = applyFeedChange(feed, change, turnId);
      if ('rejection' in result)
        throw new Error(`${sessionId}: ${result.rejection}`);
      feed = result.feed;
    };
    const state = () => ({
      rows: Object.values(feed.rows),
      snapshot: SessionSnapshot.parse({
        state:
          pendingPermission || pendingElicitation || pendingPlanProposal
            ? 'requires_action'
            : 'running',
        activeTurnId: turnId,
        usage: null,
        pendingPermission,
        pendingElicitation,
        pendingPlanProposal,
        configOptions: [],
        epoch: 0,
        maxRevision: feed.maxRevision,
        liveHeader: toLiveHeader(
          {
            activeTurnId: turnId,
            activeTurnStartedAt: turnId ? startedAt : null,
            permissionQueue: pendingPermission ? [pendingPermission] : [],
            pendingElicitation,
            pendingPlanProposal,
          },
          Object.values(feed.rows),
        ),
      }),
    });
    const prompt = cli.recordedPrompt(recording);
    if (!prompt) throw new Error('Recording has no prompt');
    apply(userMessageChange('turn-1', prompt));
    const events = cli.feedEvents(recording);
    const planEventIndex = events.findIndex(
      (event) => event.type === 'agent.planProposed',
    );
    const startsAnswerTurn =
      planEventIndex >= 0 &&
      events
        .slice(planEventIndex + 1)
        .some((event) => event.type === 'agent.turnStarted');
    for (const event of events) {
      if (event.type === 'agent.feed') apply(event.change);
      if (event.type === 'agent.permissionRequested') {
        pendingPermission = event.request;
        break;
      }
      if (event.type === 'agent.elicitationRequested') {
        pendingElicitation = { ...event.request, requestId: 'request-1' };
        break;
      }
      if (event.type === 'agent.planProposed') {
        pendingPlanProposal = { planId: event.planId, content: event.content };
        if (startsAnswerTurn) turnId = null;
        break;
      }
    }
    const pending = state();
    let answer: RequestAnswer;
    if (pendingPermission && recordedAnswer.type === 'permission') {
      const input = SessionAnswerPermissionInput.parse({
        sessionId,
        toolCallId: pendingPermission.toolCallId,
        optionId: recordedAnswer.optionId,
        message: recordedAnswer.message,
      });
      answer = { procedure: 'answerPermission', input };
      const row = Object.values(feed.rows).find(
        (row) =>
          row.sessionUpdate === 'tool_call_update' &&
          row.toolCallId === input.toolCallId,
      );
      if (row?.sessionUpdate !== 'tool_call_update')
        throw new Error('Permission has no Tool call');
      apply({
        type: 'patch',
        id: row.id,
        set: {
          _meta: {
            ...row._meta,
            argo: {
              ...row._meta?.argo,
              permissionOutcome: {
                outcome: 'selected',
                optionId: input.optionId,
              },
            },
          },
        },
      });
    } else if (pendingElicitation && recordedAnswer.type === 'elicitation') {
      answer = {
        procedure: 'answerElicitation',
        input: SessionAnswerElicitationInput.parse({
          sessionId,
          requestId: pendingElicitation.requestId,
          action: recordedAnswer.action,
          content: recordedAnswer.content,
        }),
      };
    } else if (pendingPlanProposal && recordedAnswer.type === 'plan') {
      const input = SessionAnswerPlanProposalInput.parse({
        sessionId,
        planId: pendingPlanProposal.planId,
        decision: recordedAnswer.decision,
        feedback: recordedAnswer.feedback,
      });
      answer = { procedure: 'answerPlanProposal', input };
      const row = Object.values(feed.rows).find(
        (row) =>
          row.sessionUpdate === 'plan_update' &&
          row.plan.planId === input.planId,
      );
      if (row?.sessionUpdate !== 'plan_update' || row.plan.type !== 'markdown')
        throw new Error('Proposal has no Plan row');
      apply({
        type: 'patch',
        id: row.id,
        set: {
          plan: {
            ...row.plan,
            _meta: {
              ...row.plan._meta,
              argo: {
                ...row.plan._meta?.argo,
                proposalOutcome:
                  input.decision === 'approve' ? 'approved' : 'kept_planning',
              },
            },
          },
        },
      });
      if (startsAnswerTurn) turnId = 'turn-2';
      if (input.decision === 'keep_planning')
        apply(
          userMessageChange(`${turnId}:feedback`, [
            { type: 'text', text: input.feedback },
          ]),
        );
    } else
      throw new Error(
        `${sessionId}: recording has no matching request and answer`,
      );
    pendingPermission = null;
    pendingElicitation = null;
    pendingPlanProposal = null;
    return {
      agent: `agent-${index + 1}`,
      recording,
      pending,
      answer,
      answered: state(),
    };
  });
});
writeFileSync(
  new URL('../packages/api/mocks/request-recordings.json', import.meta.url),
  `${JSON.stringify(mocks, null, 2)}\n`,
);
