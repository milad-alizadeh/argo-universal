import type { ProjectsListOutput } from '@repo/contracts';
import {
  operations,
  type OperationId,
  type OperationRow,
} from '@repo/contracts/operations';
import type { Json } from '@repo/contracts/plugins/hook-protocol';
import { createRejectionCounter } from '@repo/machine-log';
import type { z } from 'zod';
import type { RegistryDeps } from '../agents';
import type { PluginsRouterDeps } from '../plugins';
import { readProjects } from '../projects';
import type { SessionList, SessionRouterDeps } from '../sessions';
import { createAgentAccessOperations } from './agent-access';
import { recordOperation } from './call-recording';
import { createPluginOperations } from './plugins';
import { createReadOperations } from './readers';
import { createRegistryOperations } from './registry';
import { runOperation } from './router.gen';
import { listOperations } from './search';
import { scopedOperations, runSessionOperation } from './session-scope';
import { type OperationCaller, type SessionTokens } from './session-tokens';
import { sessionImplementations } from './sessions';
import { tokensMatch } from './tokens';

export type OperationsDeps = SessionRouterDeps &
  RegistryDeps & {
    controlToken: string;
    userHome: string;
    sessionTokens: SessionTokens;
    blobsFolder: string;
    plugins: PluginsRouterDeps;
  };

export type OperationResult<Id extends OperationId = OperationId> = z.output<
  (typeof operations)[Id]['result']
>;

export type OperationImplementations = {
  [Id in OperationId]: (
    params: z.output<(typeof operations)[Id]['params']>,
  ) => Promise<z.output<(typeof operations)[Id]['result']>>;
};

function createImplementations(
  deps: OperationsDeps,
  sessionList: SessionList,
): OperationImplementations {
  const rejections = createRejectionCounter('projects');

  return {
    ...createAgentAccessOperations(deps),
    ...sessionImplementations(deps),
    ...createReadOperations(deps, sessionList),
    ...createPluginOperations(deps.plugins.plugins),
    ...createRegistryOperations(deps),
    'project.list': (): Promise<ProjectsListOutput> =>
      readProjects(deps.database, rejections),
  };
}

export class Operations {
  private readonly implementations: OperationImplementations;
  public constructor(
    private readonly deps: OperationsDeps,
    sessionList: SessionList,
  ) {
    this.implementations = createImplementations(deps, sessionList);
  }
  public list(token: string | undefined, filter = ''): Promise<OperationRow[]> {
    const caller = this.caller(token);

    return recordOperation(
      { deps: this.deps, caller },
      {
        name: 'operations.list',
        label: 'Discover Operations',
        input: { filter },
      },
      async () => scopedOperations(caller, listOperations(filter)),
    );
  }
  public run(
    token: string | undefined,
    id: OperationId,
    params: Json,
  ): Promise<OperationResult> {
    const caller = this.caller(token);

    return recordOperation(
      { deps: this.deps, caller },
      { name: id, label: operations[id].label, input: params },
      () => this.authorized(caller, id, params),
    );
  }
  private async authorized(
    caller: OperationCaller,
    id: OperationId,
    params: Json,
  ): Promise<OperationResult> {
    if (caller.kind === 'session')
      return runSessionOperation(
        { implementations: this.implementations, caller, deps: this.deps },
        { id, params },
      );

    return operations[id].result.parseAsync(
      await runOperation(this.implementations, id, params),
    );
  }
  private caller(token: string | undefined): OperationCaller {
    if (token && tokensMatch(this.deps.controlToken, token))
      return { kind: 'user' };

    return this.deps.sessionTokens.require(token);
  }
  public runApp<Id extends OperationId>(
    id: Id,
    params: Json | undefined,
  ): Promise<OperationResult<Id>> {
    return runOperation(this.implementations, id, params);
  }
}
