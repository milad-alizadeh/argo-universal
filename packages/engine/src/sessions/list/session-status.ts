import type { SessionStatus } from '@repo/contracts';

export interface SessionStatusInput {
  needsInput: boolean;
  running: boolean;
  failure: string | null;
  latestTurnFailed: boolean;
  latestTurnInterrupted: boolean;
  maxRevision: number;
  seenRevision: number;
}

export function deriveSessionStatus(input: SessionStatusInput): SessionStatus {
  if (input.needsInput) return 'needs_input';
  if (input.running) return 'running';
  if (
    input.failure !== null ||
    (input.latestTurnFailed && !input.latestTurnInterrupted)
  )
    return 'failed';
  if (input.maxRevision > input.seenRevision) return 'unread';
  return 'idle';
}
