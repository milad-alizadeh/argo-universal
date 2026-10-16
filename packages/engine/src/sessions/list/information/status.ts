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

  return settledStatus(input);
}

function settledStatus(input: SessionStatusInput): SessionStatus {
  if (hasFailure(input)) return 'failed';

  return input.maxRevision > input.seenRevision ? 'unread' : 'idle';
}

function hasFailure(input: SessionStatusInput): boolean {
  return (
    input.failure !== null ||
    (input.latestTurnFailed && !input.latestTurnInterrupted)
  );
}
