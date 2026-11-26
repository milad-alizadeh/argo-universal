import type {
  SessionNewInput,
  SessionNewOutput,
  SessionNewParams,
  SessionPromptInput,
  SessionPromptOutput,
} from '@repo/contracts';
import type { Json } from '@repo/contracts/plugins/hook-protocol';
import { TRPCError } from '@trpc/server';
import type { OperationGrants } from '../../agent-access';
import type { SessionDirectory } from '../../sessions';
import type { OperationParams, OperationResult } from '../implementations';
import type { NativeStartId } from '../native-start';
import { validateParams } from '../params';
import type { SessionCaller } from '../session-tokens';
import type { ScopedRun } from './confirmation';
import type { PromptChains } from './prompt-chain';
import { SessionStarts, type StartReservation } from './starts';

// The Session directory the scope reads, the ids a new Session takes before its start, the live Prompt chains and the Always allow grants.
export type ScopePorts = {
  directory: SessionDirectory;
  createId: () => string;
  chains: PromptChains;
  canReadShell: (callerId: string, targetId: string) => boolean;
  grants: OperationGrants;
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
  chain: PromptChain;
};

// The length this call carries, and the Session that serves it once the call is admitted.
type PromptChain = { length: number; prompted: string | null };

// What a Session may start and prompt, under the delegation limits and the Prompt chain (ADR-0044).
export class Delegation {
  private readonly starts: SessionStarts;
  private readonly rules: DelegationRules = {
    'session.new': (context, params) => this.start(context, params),
    'session.prompt': (context, params) => this.prompt(context, params),
  };
  public constructor(private readonly ports: ScopePorts) {
    this.starts = new SessionStarts(ports.directory);
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
    params: SessionNewParams,
  ): Promise<SessionNewOutput> {
    const input = this.callerDefaults(context.caller, params);
    const sessionId = this.ports.createId();

    return this.admit(
      this.startDelegated(context.caller, input, sessionId),
      () => context.invoke({ id: 'session.new', params: input }, { sessionId }),
    );
  }
  // The caller's own Project and Agent, unless session.new names others.
  private callerDefaults(
    caller: SessionCaller,
    params: SessionNewParams,
  ): SessionNewInput {
    return {
      ...params,
      projectId: params.projectId ?? caller.projectId,
      agent: params.agent ?? this.ports.directory.agent(caller.sessionId),
    };
  }
  private startDelegated(
    caller: SessionCaller,
    input: SessionNewInput,
    sessionId: string,
  ): Delegated {
    const start = { kind: 'new' as const, input, sessionId };
    const prompted = input.prompt.length > 0 ? sessionId : null;

    return {
      reserved: this.starts.reserve(caller, start),
      chain: this.chainFrom(caller, prompted),
    };
  }
  // session.prompt: any Session in the caller's Project, within the limits and the Prompt chain.
  private prompt(
    context: ScopedRun,
    input: SessionPromptInput,
  ): Promise<SessionPromptOutput> {
    return this.admit(this.promptDelegated(context.caller, input), () =>
      context.invoke({ id: 'session.prompt', params: input }),
    );
  }
  private promptDelegated(
    caller: SessionCaller,
    input: SessionPromptInput,
  ): Delegated {
    const { sessionId } = input;

    if (sessionId === caller.sessionId)
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'A Session cannot send an Operation Prompt to itself',
      });

    return {
      reserved: this.starts.reserve(caller, { kind: 'prompt', sessionId }),
      chain: this.chainFrom(caller, sessionId),
    };
  }
  // The chain this call carries, read from the Turn the caller is serving.
  private chainFrom(
    caller: SessionCaller,
    prompted: string | null,
  ): PromptChain {
    return { length: this.ports.chains.sentFrom(caller.sessionId), prompted };
  }
  private async admit<Result>(
    { reserved, chain }: Delegated,
    invoke: () => Promise<Result>,
  ): Promise<Result> {
    try {
      requireWithinLimits(reserved, this.ports.chains.exceeded(chain.length));

      return await this.serving(chain, invoke);
    } finally {
      reserved.release();
    }
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

function requireWithinLimits(
  reserved: StartReservation,
  chainExceeded: boolean,
): void {
  if (reserved.exceeded !== null)
    throw new TRPCError({ code: 'CONFLICT', message: reserved.exceeded });

  if (chainExceeded)
    throw new TRPCError({
      code: 'CONFLICT',
      message: 'The Prompt chain limit has been reached',
    });
}
