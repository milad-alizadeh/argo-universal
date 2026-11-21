import type { PermissionOutcome, SessionUpdate } from '@repo/contracts';
import { expect } from 'vitest';
import { waitForAcpSnapshot } from './acp-feed';
import {
  startConversationWork,
  type ConversationWork,
} from './conversation-work';

export const deploy = 'Deploy the site';

export const runDeploy = 'Run npm run deploy';

type ToolRow = Extract<SessionUpdate, { sessionUpdate: 'tool_call_update' }>;

// The answer the voice was given under one hand-over.
export const replyTo =
  (work: ConversationWork, requestId: string) => (): string | undefined =>
    work.provider.call.sent.find(
      (say) => say.kind === 'reply' && say.requestId === requestId,
    )?.text;

// Whether the voice was told of the deploy request and the answers it may take.
export const announced = (work: ConversationWork) => (): boolean =>
  work.provider.call.sent.some(
    ({ text }) => text.includes(runDeploy) && text.includes('allow once'),
  );

type Waiting = { requestId: string; title: string };

const noRequest: Waiting = { requestId: '', title: '' };

// The Permission request the Session waits on, once one does.
export const waitingRequest = async (
  work: ConversationWork,
): Promise<Waiting> => {
  const { pendingPermission } = await waitForAcpSnapshot(
    work.host,
    work.sessionId,
    (next) => next.pendingPermission !== null,
  );

  return pendingPermission ?? noRequest;
};

export const settled = async (work: ConversationWork): Promise<void> => {
  await waitForAcpSnapshot(
    work.host,
    work.sessionId,
    (next) => next.pendingPermission === null,
  );
};

const isAskedTool = (row: SessionUpdate): row is ToolRow =>
  row.sessionUpdate === 'tool_call_update' && row.toolCallId === 'asked';

const outcomeName = (outcome: PermissionOutcome | undefined): string => {
  if (outcome === undefined) return 'waiting';

  return outcome.outcome === 'selected' ? outcome.kind : outcome.outcome;
};

type ToolArgo = NonNullable<ToolRow['_meta']>['argo'];

const argoOf = (row: ToolRow | undefined): ToolArgo | undefined =>
  row?._meta?.argo;

const askedOutcome = (
  rows: readonly SessionUpdate[],
): PermissionOutcome | undefined =>
  argoOf(rows.find(isAskedTool))?.permissionOutcome;

// How the Feed records the asked Tool call's Permission request was answered: the chosen option's kind, `cancelled`, or `waiting`.
export const outcomeOf =
  (work: ConversationWork) => async (): Promise<string> =>
    outcomeName(askedOutcome(await work.feed()));

// A call whose Agent asks permission to deploy, announced to the voice; its Turn runs on after the answer until cancelled.
export async function askedToDeploy(): Promise<ConversationWork> {
  const work = await startConversationWork([
    { prompt: deploy, asksPermission: runDeploy, untilCancelled: true },
  ]);

  await work.start();
  work.provider.call.requestWork('r1', deploy, 'turn-ask');
  await expect.poll(announced(work)).toBe(true);

  return work;
}

// The person says `words` in their turn `turnId`; the voice hands them over, as heard, under `answer-<turnId>`.
export function personAnswers(
  work: ConversationWork,
  words: string,
  turnId: string,
): void {
  work.provider.call.requestWork(`answer-${turnId}`, words, turnId);
  work.provider.call.personSays(words, turnId);
}
