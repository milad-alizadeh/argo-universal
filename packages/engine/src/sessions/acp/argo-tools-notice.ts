import type { SessionNotification } from '@agentclientprotocol/sdk';
import {
  argoToolsNoticeDescription,
  argoToolsNoticeTitle,
} from '@repo/contracts/agents/argo-tools-notice';
import type { Database } from '@repo/db';
import { feedRow } from '@repo/db/schema';
import { and, eq, sql } from 'drizzle-orm';
import type { AcpSessionLease, ArgoToolsState } from '../../agents';

type AcpNotice = Extract<
  SessionNotification['update'],
  { sessionUpdate: 'notice' }
>;

// The notice for a Session whose Agent never started `argo mcp`: its adapter dropped the MCP server Argo gave it.
export const missingArgoToolsNotice = (todoList: boolean): AcpNotice => ({
  sessionUpdate: 'notice',
  severity: 'info',
  title: argoToolsNoticeTitle,
  description: argoToolsNoticeDescription(todoList),
});

type ToolsCheck = {
  sessionId: string;
  acpLease: Pick<AcpSessionLease, 'argoTools'> | null;
  argoToolsChecked: boolean;
  input: { database: Database };
};

// Told once per Session: a reopened Session finds the notice it already stored.
const alreadyTold = ({ input, sessionId }: ToolsCheck): boolean =>
  input.database
    .select({ id: feedRow.id })
    .from(feedRow)
    .where(
      and(
        eq(feedRow.sessionId, sessionId),
        eq(feedRow.sessionUpdate, 'notice'),
        eq(
          sql`json_extract(${feedRow.payload}, '$.title')`,
          argoToolsNoticeTitle,
        ),
      ),
    )
    .get() !== undefined;

// Nothing to check for a shared connection, a Session without Agent access, or one already checked.
const uncheckedTools = (
  context: ToolsCheck,
): (() => ArgoToolsState) | undefined =>
  context.argoToolsChecked ? undefined : context.acpLease?.argoTools;

// A notice already in the Feed settles the check as if the tools had loaded.
const unlessTold = (
  state: ArgoToolsState,
  context: ToolsCheck,
): ArgoToolsState =>
  state === 'missing' && alreadyTold(context) ? 'loaded' : state;

// At a Turn's end: `unsettled` when there is nothing to check or `argo mcp` may still start, so a later Turn checks again.
export function argoToolsOutcome(
  context: ToolsCheck,
): 'unsettled' | 'loaded' | 'missing' {
  const argoTools = uncheckedTools(context);
  const state = argoTools ? unlessTold(argoTools(), context) : 'waiting';

  return state === 'waiting' ? 'unsettled' : state;
}
