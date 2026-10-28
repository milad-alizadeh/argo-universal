import type {
  SessionNewInput,
  SessionNewOutput,
  SessionPromptInput,
  SessionPromptOutput,
} from '@repo/contracts';
import type { OperationCard, SessionDirectory } from '../../sessions';
import { admitted, cardUnless, type ScopedRun } from './admission';
import { ScopeCoverage } from './coverage';
import { promptCard, startCard } from './rules';
import { SessionStarts, type StartReservation } from './starts';
import { scopeTarget } from './targets';

type DelegationPorts = { directory: SessionDirectory; createId: () => string };

// The reservation, whether the target is the caller's own, and the card to show otherwise.
type Delegated = {
  reserved: StartReservation;
  owned: () => boolean;
  card: OperationCard;
};

// A caller's own Agents: the Sessions it starts and prompts, under the delegation limits (ADR-0044).
export class Delegation {
  private readonly starts: SessionStarts;
  private readonly coverage: ScopeCoverage;
  public constructor(private readonly ports: DelegationPorts) {
    this.starts = new SessionStarts(ports.directory);
    this.coverage = new ScopeCoverage(ports.directory);
  }
  // session.new: in the caller's Project, within the limits.
  public start(
    context: ScopedRun,
    input: SessionNewInput,
  ): Promise<SessionNewOutput> {
    const { caller } = context;
    const sessionId = this.ports.createId();
    const start = { kind: 'new' as const, input, sessionId };
    const reserved = this.starts.reserve(caller, start);
    const { target } = scopeTarget('session.new', input, caller);
    const owned = (): boolean => this.coverage.inProject(caller, target);

    return this.admit(context, { reserved, owned, card: startCard }, () =>
      context.invoke({ id: 'session.new', params: input }, { sessionId }),
    );
  }
  // session.prompt: one of the caller's Agents, within the limits.
  public prompt(
    context: ScopedRun,
    input: SessionPromptInput,
  ): Promise<SessionPromptOutput> {
    const { caller } = context;
    const { target } = scopeTarget('session.prompt', input, caller);
    const { sessionId } = input;
    const reserved = this.starts.reserve(caller, { kind: 'prompt', sessionId });
    const owned = (): boolean => this.coverage.ownsAgent(caller, target);

    return this.admit(context, { reserved, owned, card: promptCard }, () =>
      context.invoke({ id: 'session.prompt', params: input }),
    );
  }
  private admit<Result>(
    context: ScopedRun,
    { reserved, owned, card }: Delegated,
    invoke: () => Promise<Result>,
  ): Promise<Result> {
    const chosen = (): OperationCard | undefined =>
      cardUnless(owned() && !reserved.exceedsLimits, card);

    return admitted(
      context,
      { card: chosen, release: reserved.release },
      invoke,
    );
  }
}
