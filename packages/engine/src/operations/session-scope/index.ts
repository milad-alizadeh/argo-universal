import { operations, type OperationId } from '@repo/contracts/operations';
import type { Json } from '@repo/contracts/plugins/hook-protocol';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import type { OperationParams, OperationResult } from '../implementations';
import { isNativeStartOperation, type NativeStartId } from '../native-start';
import { operationPermission } from '../operation-permission';
import { validateParams } from '../params';
import { cardFor, grantFor, record } from './always-allow';
import type { ScopedRun } from './confirmation';
import { Delegation, type ScopePorts } from './delegation';
import { scopedParams } from './targets';

export { PromptChains } from './prompt-chain';

export type { ScopedRun } from './confirmation';

type TargetedId = Exclude<OperationId, NativeStartId>;

// An Operation with the params its scope parsed once.
type ParsedOperation<Id extends OperationId> = {
  id: Id;
  params: OperationParams<Id>;
};

const parsed = <Id extends TargetedId>(
  id: Id,
  params: Json,
): ParsedOperation<Id> => ({ id, params: validateParams(id, params) });

const projectTarget = z.object({ projectId: z.string() });

const sessionTarget = z.object({ sessionId: z.string() });

const terminalTarget = z.object({
  sessionId: z.string(),
  shellId: z.string().optional(),
});

// The policy that applies to this call, and the Project the call acts in.
type Admission = {
  id: OperationId;
  policy: ReturnType<typeof operationPermission>;
  targetProjectId: string;
};

// The registry policy decides whether a Session token’s Operation asks first (ADR-0044).
export class SessionScope {
  private readonly delegation: Delegation;
  public constructor(private readonly ports: ScopePorts) {
    this.delegation = new Delegation(ports);
  }
  // Params are parsed once here, and the Operation runs with exactly these; every failure rejects.
  public async run(
    context: ScopedRun,
    { id, params }: { id: OperationId; params: Json },
  ): Promise<OperationResult> {
    if (isNativeStartOperation(id)) {
      const policy = operationPermission(operations[id].policy, false);
      const targetProjectId = context.caller.projectId;

      return this.permitted(context, { id, policy, targetProjectId }, () =>
        this.delegation.run(context, { id, params }),
      );
    }

    return this.runTargeted(context, { id, params });
  }
  private runTargeted(
    context: ScopedRun,
    { id, params }: { id: TargetedId; params: Json },
  ): Promise<OperationResult> {
    if (id === 'project.list')
      return this.admit(context, parsed(id, params), (scoped) =>
        listProjects(context, scoped),
      );

    return this.admit(context, parsed(id, params), (scoped) =>
      context.invoke({ id, params: scoped }),
    );
  }
  // Caller defaults are applied before the Operation policy is evaluated.
  private admit<Id extends TargetedId, Result>(
    context: ScopedRun,
    { id, params }: ParsedOperation<Id>,
    invoke: (params: OperationParams<Id>) => Promise<Result>,
  ): Promise<Result> {
    const scoped = scopedParams(id, params, context.caller);
    this.admitTerminal(context.caller.sessionId, id, scoped);
    const admission = this.admission(context, id, scoped);

    return this.permitted(context, admission, () => invoke(scoped));
  }
  // An Agent may read a shell in its Checkout. An Agent never types into a person's shell (ADR-0063).
  private admitTerminal(
    callerId: string,
    id: OperationId,
    params: OperationParams,
  ): void {
    if (id !== 'terminal.send' && id !== 'terminal.read') return;
    const { sessionId, shellId } = terminalTarget.parse(params);

    if (shellId === undefined) return;

    if (id === 'terminal.send' || !this.ports.canReadShell(callerId, sessionId))
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'The Session can only read shell Terminals in its Checkout.',
      });
  }
  /*
   * An Operation that asks runs once the person allows it. Always allow records a grant, for an Operation that opts
   * in, keyed by the caller's Project and the Project the call acts in; a granted call still needs the calling
   * Session's active Turn, as discovery says (ADR-0044).
   */
  private async permitted<Result>(
    { caller, call }: ScopedRun,
    { id, policy, targetProjectId }: Admission,
    invoke: () => Promise<Result>,
  ): Promise<Result> {
    if (policy !== 'ask') return invoke();

    const grant = grantFor(this.ports, { caller, id, targetProjectId });

    if (grant && call.canConfirm && this.ports.grants.granted(grant))
      return invoke();

    const consent = await call.confirm(cardFor(this.ports, id, grant));

    if (consent === 'always' && grant) await record(this.ports, grant);

    return invoke();
  }
  private admission(
    context: ScopedRun,
    id: OperationId,
    params: OperationParams,
  ): Admission {
    const { policy } = operations[id];
    const own = context.caller.projectId;

    if (policy !== 'ask-outside-project')
      return {
        id,
        policy: operationPermission(policy, false),
        targetProjectId: own,
      };

    const targetProjectId = this.targetProject(id, params);

    return {
      id,
      policy: operationPermission(policy, false, targetProjectId !== own),
      targetProjectId,
    };
  }
  private targetProject(id: OperationId, params: OperationParams): string {
    if (id.startsWith('project.')) return projectTarget.parse(params).projectId;

    const { sessionId } = sessionTarget.parse(params);

    return this.ports.directory.session(sessionId).projectId;
  }
}

// project.list marks the caller's own Project, after the result is parsed.
async function listProjects(
  { caller, invoke }: ScopedRun,
  params: OperationParams<'project.list'>,
): Promise<OperationResult<'project.list'>> {
  const projects = await invoke({ id: 'project.list', params });

  return projects.map((project) => ({
    ...project,
    inScope: project.id === caller.projectId,
  }));
}
