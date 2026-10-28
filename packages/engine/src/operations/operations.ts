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
import type { SessionRouterDeps } from '../sessions';
import { createAgentAccessOperations } from './agent-access';
import { createPluginOperations } from './plugins';
import { createReadOperations } from './readers';
import { createRegistryOperations } from './registry';
import { runOperation } from './router.gen';
import { listOperations } from './search';
import { sessionImplementations } from './sessions';
import { requireUserToken } from './tokens';

export type OperationsDeps = SessionRouterDeps &
  RegistryDeps & {
    controlToken: string;
    userHome: string;
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

function createImplementations(deps: OperationsDeps): OperationImplementations {
  const rejections = createRejectionCounter('projects');

  return {
    ...createAgentAccessOperations(deps),
    ...sessionImplementations(deps),
    ...createReadOperations(deps),
    ...createPluginOperations(deps.plugins.plugins),
    ...createRegistryOperations(deps),
    'project.list': (): Promise<ProjectsListOutput> =>
      readProjects(deps.database, rejections),
  };
}

export class Operations {
  private readonly implementations: OperationImplementations;
  public constructor(private readonly deps: OperationsDeps) {
    this.implementations = createImplementations(deps);
  }
  public list(token: string | undefined, filter = ''): OperationRow[] {
    requireUserToken(this.deps.controlToken, token);

    return listOperations(filter);
  }
  public async run(
    token: string | undefined,
    id: OperationId,
    params: Json,
  ): Promise<OperationResult> {
    requireUserToken(this.deps.controlToken, token);

    return operations[id].result.parseAsync(
      await runOperation(this.implementations, id, params),
    );
  }
  public runApp<Id extends OperationId>(
    id: Id,
    params: Json | undefined,
  ): Promise<OperationResult<Id>> {
    return runOperation(this.implementations, id, params);
  }
}
