import type { SessionNewInput } from '@repo/contracts';
import type { SessionDirectory } from '../../sessions';
import type { SessionCaller } from '../session-tokens';
import { startedByCaller } from './rules';

export type StartTarget =
  | { kind: 'new'; input: SessionNewInput; sessionId: string }
  | { kind: 'prompt'; sessionId: string };

// A reserved running slot, held until the start or Prompt settles; `exceeded` says which limit refused it, and why.
export type StartReservation = { exceeded: string | null; release: () => void };

const maxRunningAgents = 5;

const maxDelegationDepth = 2;

const limitReached = 'The Session delegation limit has been reached';

const noStart: StartReservation = { exceeded: null, release: () => {} };

/*
 * The delegation limits: Agents at most 2 levels deep and 5 running at once, counting starts not yet settled. A
 * Prompt to a Session already running or being started steers or queues there, so it starts no Agent and takes no
 * slot.
 */
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
      exceeded:
        depth > maxDelegationDepth ? tooDeep(target, depth) : reserved.exceeded,
    };
  }
  private reserveRunning(
    caller: SessionCaller,
    target: StartTarget,
  ): StartReservation {
    if (!this.startsAgent(caller, target)) return noStart;

    return this.reserveSlot(caller.sessionId, target);
  }
  private reserveSlot(
    callerId: string,
    { kind, sessionId }: StartTarget,
  ): StartReservation {
    const pending = this.pending.get(callerId) ?? new Map<string, number>();
    const occupied = new Set([
      ...this.directory.running(callerId),
      ...pending.keys(),
    ]);
    const steers = kind === 'prompt' && occupied.has(sessionId);
    pending.set(sessionId, (pending.get(sessionId) ?? 0) + 1);
    this.pending.set(callerId, pending);

    return {
      exceeded:
        !steers && occupied.size >= maxRunningAgents
          ? tooManyRunning([...occupied])
          : null,
      release: () => this.release(callerId, sessionId),
    };
  }
  private startsAgent(caller: SessionCaller, target: StartTarget): boolean {
    if (target.kind === 'new') return target.input.prompt.length > 0;

    return startedByCaller(caller, this.directory.session(target.sessionId));
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

function tooDeep(target: StartTarget, depth: number): string {
  const what =
    target.kind === 'new'
      ? `a Session started here would be ${depth} levels deep`
      : `Session ${target.sessionId} is ${depth} levels deep`;

  return `${limitReached}: Sessions delegate at most ${maxDelegationDepth} levels deep, and ${what}. Run this from a Session higher up the delegation tree, or do the work in this Session.`;
}

function tooManyRunning(occupied: string[]): string {
  return `${limitReached}: a Session may have at most ${maxRunningAgents} Sessions it started running at once, and these are running or starting: ${occupied.join(', ')}. Wait for one to finish its Turn, or cancel one with session.cancel. A Prompt to one of these steers or queues there and does not count, and session.new without a Prompt does not count.`;
}
