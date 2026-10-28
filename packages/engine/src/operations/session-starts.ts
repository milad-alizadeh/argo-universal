import type { SessionNewInput } from '@repo/contracts';
import { runningStartedSessions } from '../sessions';
import type { OperationsDeps } from './operations';
import type { SessionCaller } from './session-tokens';

export type SessionStartTarget =
  | { kind: 'new'; input: SessionNewInput; sessionId: string }
  | { kind: 'prompt'; sessionId: string };

export type SessionStartAdmission = {
  needsConfirmation: boolean;
  release: () => void;
};

const maxRunningAgents = 5;

const maxDelegationDepth = 2;

const noStart: SessionStartAdmission = {
  needsConfirmation: false,
  release: () => {},
};

export class SessionStarts {
  private readonly pending = new Map<string, Map<string, number>>();
  public constructor(private readonly deps: OperationsDeps) {}

  public reserve(
    caller: SessionCaller,
    target: SessionStartTarget,
  ): SessionStartAdmission {
    const depth =
      target.kind === 'new'
        ? this.depth(caller.sessionId) + 1
        : this.depth(target.sessionId);

    const reserved = this.reserveRunning(caller, target);

    return {
      ...reserved,
      needsConfirmation:
        depth > maxDelegationDepth || reserved.needsConfirmation,
    };
  }

  private reserveRunning(
    caller: SessionCaller,
    target: SessionStartTarget,
  ): SessionStartAdmission {
    if (!this.startsAgent(caller, target)) return noStart;

    return this.reserveSlot(caller.sessionId, target.sessionId);
  }

  private reserveSlot(
    callerId: string,
    sessionId: string,
  ): SessionStartAdmission {
    const pending = this.pending.get(callerId) ?? new Map<string, number>();
    const running = runningStartedSessions(this.deps, callerId);
    const occupied = new Set([...running, ...pending.keys()]);
    pending.set(sessionId, (pending.get(sessionId) ?? 0) + 1);
    this.pending.set(callerId, pending);

    return this.admission(callerId, sessionId, occupied.size);
  }

  private admission(
    callerId: string,
    sessionId: string,
    count: number,
  ): SessionStartAdmission {
    return {
      needsConfirmation: count >= maxRunningAgents,
      release: () => this.release(callerId, sessionId),
    };
  }

  private startsAgent(
    caller: SessionCaller,
    target: SessionStartTarget,
  ): boolean {
    if (target.kind === 'new') return target.input.prompt.length > 0;

    return (
      this.deps.readSession(target.sessionId).startedBySessionId ===
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
    let parent = this.deps.readSession(sessionId).startedBySessionId;

    while (parent !== null) {
      depth += 1;
      parent = this.deps.readSession(parent).startedBySessionId;
    }

    return depth;
  }
}

function releaseReservation(pending: Map<string, number>, id: string): void {
  const count = pending.get(id) ?? 0;

  if (count <= 1) pending.delete(id);
  else pending.set(id, count - 1);
}
