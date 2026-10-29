import type { SessionUpdate } from '@repo/contracts';
import type { RuntimeWorkload } from './runtime-types.mts';

export function agentText(row: SessionUpdate): string {
  if (row.sessionUpdate !== 'agent_message') return '';

  return row.content
    .flatMap((part) => (part.type === 'text' ? [part.text] : []))
    .join('');
}

export function expectedStop(workload: RuntimeWorkload): string {
  return workload.cancelWhenAccepted || workload.cancelAfterStdout
    ? 'cancelled'
    : 'end_turn';
}

export function validateReply(reply: string, workload: RuntimeWorkload): void {
  if (workload.expectedReply === undefined) return;

  if (reply !== workload.expectedReply)
    throw new Error(
      'Final Agent reply did not exactly match the expected sentinel',
    );
}

export function finalReply(rows: SessionUpdate[]): string {
  const last = rows.findLast((row) => agentText(row).length > 0);

  return last ? agentText(last) : '';
}

export function replyMatches(
  reply: string,
  work: RuntimeWorkload,
): boolean | null {
  return work.expectedReply === undefined ? null : reply === work.expectedReply;
}
