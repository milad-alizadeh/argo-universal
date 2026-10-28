import type { SessionNewInput } from '@repo/contracts';
import type { SessionDirectory } from '../../sessions';
import type { SessionCaller } from '../session-tokens';

export type StartTarget =
  | { kind: 'new'; input: SessionNewInput; sessionId: string }
  | { kind: 'prompt'; sessionId: string };

// A reserved running slot, held until the start or Prompt settles.
export type StartReservation = { exceedsLimits: boolean; release: () => void };

const maxRunningAgents = 5;

const maxDelegationDepth = 2;

const noStart: StartReservation = { exceedsLimits: false, release: () => {} };

// The delegation limits: Agents at most 2 levels deep and 5 running at once, counting starts not yet settled.
export class SessionStarts {
  private readonly pending = new Map<string, Map<string, number>>();
  public constructor(private readonly directory: SessionDirectory) {}
  public reserve(caller: SessionCaller, target: StartTarget): StartReservation {
    const depth =
      target.kind === 'new'
        ? this.depth(caller.sessionId) + 1
        : this.depth(target.sessionId);

    const reserved = this.reserveRunning(caller, target);

    return {
      ...reserved,
      exceedsLimits: depth > maxDelegationDepth || reserved.exceedsLimits,
    };
  }
  private reserveRunning(
    caller: SessionCaller,
    target: StartTarget,
  ): StartReservation {
    if (!this.startsAgent(caller, target)) return noStart;

    return this.reserveSlot(caller.sessionId, target.sessionId);
  }
  private reserveSlot(callerId: string, sessionId: string): StartReservation {
    const pending = this.pending.get(callerId) ?? new Map<string, number>();
    const running = this.directory.running(callerId);
    const occupied = new Set([...running, ...pending.keys()]);
    pending.set(sessionId, (pending.get(sessionId) ?? 0) + 1);
    this.pending.set(callerId, pending);

    return {
      exceedsLimits: occupied.size >= maxRunningAgents,
      release: () => this.release(callerId, sessionId),
    };
  }
  private startsAgent(caller: SessionCaller, target: StartTarget): boolean {
    if (target.kind === 'new') return target.input.prompt.length > 0;

    return (
      this.directory.session(target.sessionId).startedBySessionId ===
      caller.sessionId
    );
  }
  private release(callerId: string, sessionId: string): void {
    const pending = this.pending.get(callerId);

    if (!pending) return;
    releaseReservation(pending, sessionId);

    if (pending.size === 0) this.pending.delete(callerId);
  }
  private depth(sessionId: string): number {
    let depth = 0;
    let parent = this.directory.session(sessionId).startedBySessionId;

    while (parent !== null) {
      depth += 1;
      parent = this.directory.session(parent).startedBySessionId;
    }

    return depth;
  }
}

function releaseReservation(pending: Map<string, number>, id: string): void {
  const count = pending.get(id) ?? 0;

  if (count <= 1) pending.delete(id);
  else pending.set(id, count - 1);
}
