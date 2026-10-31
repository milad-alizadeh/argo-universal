import type { OperationId } from '@repo/contracts/operations';
import type { Json } from '@repo/contracts/plugins/hook-protocol';
import type { OperationCard } from '../../sessions';
import type { OperationParams, OperationResult } from '../implementations';
import { isNativeStartOperation, type NativeStartId } from '../native-start';
import { validateParams } from '../params';
import type { SessionCaller } from '../session-tokens';
import {
  cardUnless,
  confirmed,
  unreserved,
  type ScopedRun,
} from './confirmation';
import { ScopeCoverage } from './coverage';
import { Delegation, type ScopePorts } from './delegation';
import { operationCard } from './rules';
import { scopeTarget, type ScopeTarget } from './targets';

export { scopedOperations } from './listing';

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

// A Session token's Operation runs within the caller's scope, or asks the user first (ADR-0044).
export class SessionScope {
  private readonly delegation: Delegation;
  private readonly coverage: ScopeCoverage;
  public constructor(ports: ScopePorts) {
    this.delegation = new Delegation(ports);
    this.coverage = new ScopeCoverage(ports.directory);
  }
  // Params are parsed once here, and the Operation runs with exactly these; every failure rejects.
  public async run(
    context: ScopedRun,
    { id, params }: { id: OperationId; params: Json },
  ): Promise<OperationResult> {
    if (isNativeStartOperation(id))
      return this.delegation.run(context, { id, params });

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
  // The target table names what the Operation reaches; its tier says what the caller's scope covers.
  private admit<Id extends TargetedId, Result>(
    context: ScopedRun,
    { id, params }: ParsedOperation<Id>,
    invoke: (params: OperationParams<Id>) => Promise<Result>,
  ): Promise<Result> {
    const scoped = scopeTarget(id, params, context.caller);

    const card = (): OperationCard | undefined =>
      this.card(context.caller, { id, target: scoped.target });

    return confirmed(context, { card, release: unreserved }, () =>
      invoke(scoped.params),
    );
  }
  private card(
    caller: SessionCaller,
    operation: { id: OperationId; target: ScopeTarget },
  ): OperationCard | undefined {
    return cardUnless(
      this.coverage.covers(caller, operation),
      operationCard(operation.id),
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
