import { operations, type OperationId } from '@repo/contracts/operations';
import type { Json } from '@repo/contracts/plugins/hook-protocol';
import { z } from 'zod';
import type { OperationCard } from '../../sessions';
import type { OperationParams, OperationResult } from '../implementations';
import { isNativeStartOperation, type NativeStartId } from '../native-start';
import { operationPermission } from '../operation-permission';
import { validateParams } from '../params';
import {
  cardUnless,
  confirmed,
  unreserved,
  type ScopedRun,
} from './confirmation';
import { Delegation, type ScopePorts } from './delegation';
import { operationCard } from './rules';
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

type Admission = {
  id: OperationId;
  policy: ReturnType<typeof operationPermission>;
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

      return this.permitted(context, { id, policy }, () =>
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
    const policy = this.permission(context, id, scoped);

    return this.permitted(context, { id, policy }, () => invoke(scoped));
  }
  private permitted<Result>(
    context: ScopedRun,
    { id, policy }: Admission,
    invoke: () => Promise<Result>,
  ): Promise<Result> {
    const card = (): OperationCard | undefined =>
      cardUnless(policy !== 'ask', operationCard(id));

    return confirmed(context, { card, release: unreserved }, invoke);
  }
  private permission(
    context: ScopedRun,
    id: OperationId,
    params: OperationParams,
  ): ReturnType<typeof operationPermission> {
    const { policy } = operations[id];

    if (policy !== 'ask-outside-project')
      return operationPermission(policy, false);

    if (id.startsWith('project.')) {
      const { projectId } = projectTarget.parse(params);

      return operationPermission(
        policy,
        false,
        projectId !== context.caller.projectId,
      );
    }

    const { sessionId } = sessionTarget.parse(params);
    const target = this.ports.directory.session(sessionId);

    return operationPermission(
      policy,
      false,
      target.projectId !== context.caller.projectId,
    );
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
