import type { SessionSnapshot, Subagent } from '@repo/contracts';
import type { SessionHappening } from './session-link';

type Listener = (happening: SessionHappening) => void;

type State = Subagent['state'];

/*
 * Whether an Agent finished now: one the call saw working went idle, or one it had not seen before is idle already,
 * once the call knows which Agents there were when it began.
 */
const finishedNow = (
  before: State | undefined,
  now: State,
  seeded: boolean,
): boolean =>
  now === 'idle' && (before === undefined ? seeded : before !== 'idle');

/*
 * The Agents the call's Session started, read from its snapshots (ADR-0064): one that was working when the call began,
 * or began during it, is heard once when it finishes. Its Input requests are its parent's, which the voice already hears.
 */
export class StartedAgents {
  private readonly states = new Map<string, State>();
  private seeded = false;

  public constructor(private readonly listener: Listener) {}

  public changed({ subagents }: SessionSnapshot): void {
    for (const agent of subagents) this.read(agent);
    this.seeded = true;
  }

  private read({ sessionId, state, title, stopReason }: Subagent): void {
    const before = this.states.get(sessionId);
    this.states.set(sessionId, state);

    if (finishedNow(before, state, this.seeded))
      this.listener({ type: 'agent.ended', title, stopReason });
  }
}
