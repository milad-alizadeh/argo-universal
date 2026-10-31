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
import type { SessionCaller } from '../session-tokens';
import { cardUnless, confirmed, type ScopedRun } from './confirmation';
import { ScopeCoverage } from './coverage';
import type { PromptChains } from './prompt-chain';
import { promptCard, startCard } from './rules';
import { SessionStarts, type StartReservation } from './starts';
import { scopeTarget } from './targets';

// The Session directory the scope reads, the ids a new Session takes before its start, and the live Prompt chains.
export type ScopePorts = {
  directory: SessionDirectory;
  createId: () => string;
  chains: PromptChains;
};

// Each native start's own delegation rule, keyed by the one list of native starts.
type DelegationRules = {
  [Id in NativeStartId]: (
    context: ScopedRun,
    params: OperationParams<Id>,
  ) => Promise<OperationResult<Id>>;
};

// The reservation, whether the target is in the caller's reach, the Prompt chain this call carries, and the card to show otherwise.
type Delegated = {
  reserved: StartReservation;
  inReach: () => boolean;
  chain: PromptChain;
  card: OperationCard;
};

// The length this call carries, and the Session that serves it once the call is admitted.
type PromptChain = { length: number; prompted: string | null };

// What a Session may start and prompt, under the delegation limits and the Prompt chain (ADR-0044).
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
    const sessionId = this.ports.createId();

    return this.admit(
      context,
      this.startDelegated(context.caller, input, sessionId),
      () => context.invoke({ id: 'session.new', params: input }, { sessionId }),
    );
  }
  private startDelegated(
    caller: SessionCaller,
    input: SessionNewInput,
    sessionId: string,
  ): Delegated {
    const { target } = scopeTarget('session.new', input, caller);
    const start = { kind: 'new' as const, input, sessionId };
    const prompted = input.prompt.length > 0 ? sessionId : null;

    return {
      reserved: this.starts.reserve(caller, start),
      inReach: () => this.coverage.inProject(caller, target),
      chain: this.chainFrom(caller, prompted),
      card: startCard,
    };
  }
  // session.prompt: any Session in the caller's Project, within the limits and the Prompt chain.
  private prompt(
    context: ScopedRun,
    input: SessionPromptInput,
  ): Promise<SessionPromptOutput> {
    return this.admit(
      context,
      this.promptDelegated(context.caller, input),
      () => context.invoke({ id: 'session.prompt', params: input }),
    );
  }
  private promptDelegated(
    caller: SessionCaller,
    input: SessionPromptInput,
  ): Delegated {
    const { target } = scopeTarget('session.prompt', input, caller);
    const { sessionId } = input;

    return {
      reserved: this.starts.reserve(caller, { kind: 'prompt', sessionId }),
      inReach: () => this.coverage.mayPrompt(caller, target),
      chain: this.chainFrom(caller, sessionId),
      card: promptCard,
    };
  }
  // The chain this call carries, read from the Turn the caller is serving.
  private chainFrom(
    caller: SessionCaller,
    prompted: string | null,
  ): PromptChain {
    return { length: this.ports.chains.sentFrom(caller.sessionId), prompted };
  }
  private admit<Result>(
    context: ScopedRun,
    { reserved, inReach, chain, card }: Delegated,
    invoke: () => Promise<Result>,
  ): Promise<Result> {
    const within = (): boolean =>
      !reserved.exceedsLimits && !this.ports.chains.exceeded(chain.length);

    const chosen = (): OperationCard | undefined =>
      cardUnless(inReach() && within(), card);

    return confirmed(context, { card: chosen, release: reserved.release }, () =>
      this.serving(chain, invoke),
    );
  }
  /*
   * The Prompt is going now, so the Session it reaches serves its chain from here. A Prompt the owner refused or
   * the scope turned back never gets this far, and leaves that Session serving the chain it is serving already.
   */
  private serving<Result>(
    { length, prompted }: PromptChain,
    invoke: () => Promise<Result>,
  ): Promise<Result> {
    if (prompted !== null) this.ports.chains.serving(prompted, length);

    return invoke();
  }
}
