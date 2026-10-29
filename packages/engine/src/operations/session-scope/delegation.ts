import type {
  SessionNewInput,
  SessionNewOutput,
  SessionPromptInput,
  SessionPromptOutput,
} from '@repo/contracts';
import type { Json } from '@repo/contracts/plugins/hook-protocol';
import type { OperationCard, SessionDirectory } from '../../sessions';
import type { OperationParams, OperationResult } from '../implementations';
import type { NativeStartId } from '../native-start';
import { validateParams } from '../params';
import { cardUnless, confirmed, type ScopedRun } from './confirmation';
import { ScopeCoverage } from './coverage';
import { promptCard, startCard } from './rules';
import { SessionStarts, type StartReservation } from './starts';
import { scopeTarget } from './targets';

// The Session directory the scope reads, and the ids a new Session takes before its start.
export type ScopePorts = {
  directory: SessionDirectory;
  createId: () => string;
};

// Each native start's own delegation rule, keyed by the one list of native starts.
type DelegationRules = {
  [Id in NativeStartId]: (
    context: ScopedRun,
    params: OperationParams<Id>,
  ) => Promise<OperationResult<Id>>;
};

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
  private readonly rules: DelegationRules = {
    'session.new': (context, params) => this.start(context, params),
    'session.prompt': (context, params) => this.prompt(context, params),
  };
  public constructor(private readonly ports: ScopePorts) {
    this.starts = new SessionStarts(ports.directory);
    this.coverage = new ScopeCoverage(ports.directory);
  }
  // Params are parsed once here, and the start runs with exactly these.
  public run<Id extends NativeStartId>(
    context: ScopedRun,
    { id, params }: { id: Id; params: Json },
  ): Promise<OperationResult<Id>> {
    return this.rules[id](context, validateParams(id, params));
  }
  // session.new: in the caller's Project, within the limits.
  private start(
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
  private prompt(
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

    return confirmed(
      context,
      { card: chosen, release: reserved.release },
      invoke,
    );
  }
}
