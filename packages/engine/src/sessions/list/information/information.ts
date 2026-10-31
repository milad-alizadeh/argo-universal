import type {
  AgentMessage,
  LiveHeader,
  PlanUpdate,
  SessionRecord,
  SessionInfo,
  Turn,
} from '@repo/contracts';
import { type LiveSession } from '../../live-header';
import { toSessionCheckout } from '../../session-record';
import type { SessionListState } from '../state';
import { SessionInfoActivity } from './activity';

export interface SessionInfoInput {
  row: SessionRecord;
  turns: readonly Turn[];
  message: AgentMessage | undefined;
  plan: PlanUpdate | undefined;
  live: (LiveSession & { failure: string | null }) | null;
  feed: { maxRevision: number; activityAt: number } | null;
  liveHeader: LiveHeader | null;
  // The Live header reader's active Turn.
  activeTurnId: string | null;
  children: readonly SessionRecord[];
  shells?: SessionInfo['shells'];
}

export function toSessionInfo(
  input: SessionInfoInput,
): SessionListState[number] {
  const derived = new SessionInfoActivity(input);

  return {
    information: sessionInformation(input, derived),
    running: derived.running(),
  };
}

function sessionInformation(
  input: SessionInfoInput,
  derived: SessionInfoActivity,
): SessionListState[number]['information'] {
  const { row } = input;

  return {
    ...sessionIdentity(row),
    status: derived.status(),
    activity: derived.activity(),
    activityAt: activityAt(input),
    checkout: toSessionCheckout(row),
    ...sessionDetails(input),
  };
}

function activityAt(input: SessionInfoInput): number {
  return input.feed && input.feed.maxRevision > input.row.maxRevision
    ? input.feed.activityAt
    : input.row.activityAt;
}

function planSummary(
  plan: SessionInfoInput['plan'],
): SessionListState[number]['information']['plan'] {
  if (!plan) return null;

  return visiblePlanSummary(plan);
}

function visiblePlanSummary(
  plan: PlanUpdate,
): SessionListState[number]['information']['plan'] {
  if (plan.plan.type !== 'items') return null;

  if (removedPlan(plan)) return null;

  return itemCounts(plan.plan.entries);
}

function itemCounts(
  entries: Extract<PlanUpdate['plan'], { type: 'items' }>['entries'],
): NonNullable<SessionListState[number]['information']['plan']> {
  return {
    done: entries.filter((entry): boolean => entry.status === 'completed')
      .length,
    total: entries.length,
  };
}

function subagentCounts(
  input: SessionInfoInput,
): SessionListState[number]['information']['subagents'] {
  return {
    total: input.children.length,
    running: input.children.filter((child): boolean =>
      input.turns.some(
        (turn): boolean =>
          turn.sessionId === child.id && turn.status === 'running',
      ),
    ).length,
  };
}

type SessionIdentity = Pick<
  SessionListState[number]['information'],
  | 'sessionId'
  | 'projectId'
  | 'agent'
  | 'parentSessionId'
  | 'startedBySessionId'
  | 'cwd'
  | 'createdAt'
  | 'updatedAt'
  | 'title'
  | 'titleSource'
>;

function sessionIdentity(row: SessionRecord): SessionIdentity {
  return {
    sessionId: row.id,
    projectId: row.projectId,
    agent: row.agent,
    parentSessionId: row.parentSessionId,
    startedBySessionId: row.startedBySessionId,
    cwd: row.checkoutPath,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    title: listedTitle(row),
    titleSource: row.titleSource,
  };
}

// A Session an Agent started lists before any prompt named it, so the row says what it is until the first prompt does.
function listedTitle(row: SessionRecord): string {
  return row.title === '' ? 'New Session' : row.title;
}

function sessionDetails(
  input: SessionInfoInput,
): Pick<
  SessionListState[number]['information'],
  'plan' | 'subagents' | 'shells' | 'archivedAt' | 'pullRequest'
> {
  return {
    plan: planSummary(input.plan),
    subagents: subagentCounts(input),
    shells: input.shells ?? { total: 0, running: 0 },
    archivedAt: input.row.archivedAt,
    pullRequest: null,
  };
}

function removedPlan(plan: PlanUpdate): boolean {
  return Boolean(plan._meta?.argo?.removed);
}
