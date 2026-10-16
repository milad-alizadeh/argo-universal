import {
  AgentId,
  AgentRemovalInput,
  AgentInstallInput,
  AgentInstallCancelInput,
  AgentInstallOperation,
  AgentInstallStatus,
} from '@repo/contracts';
import {
  publicProcedure,
  router,
  routerFactory,
  mergeRouters,
} from '../../rpc';
import {
  changeAgentServer,
  type RegistryDeps,
} from '../registry/registry-router';
import type { AgentInstallations } from './lifecycle/operations';

export const createInstallRouter = routerFactory(
  ({
    installations,
    registry,
  }: {
    installations: AgentInstallations;
    registry: RegistryDeps;
  }) =>
    mergeRouters(
      managementRouter({ installations, registry }),
      installationRouter(installations),
    ),
);

const installationRouter = routerFactory((installations: AgentInstallations) =>
  router({
    install: publicProcedure
      .input(AgentInstallInput)
      .output(AgentInstallOperation)
      .mutation(({ input }) => installations.start(input)),
    installStatus: publicProcedure
      .input(AgentId)
      .output(AgentInstallStatus)
      .query(({ input }) => installations.status(input.agentId)),
    cancelInstall: publicProcedure
      .input(AgentInstallCancelInput)
      .mutation(({ input }) => installations.cancel(input)),
  }),
);

const managementRouter = routerFactory(
  ({
    installations,
    registry,
  }: {
    installations: AgentInstallations;
    registry: RegistryDeps;
  }) =>
    router({
      remove: publicProcedure
        .input(AgentRemovalInput)
        .mutation(({ input }) =>
          removeAgent({ input, installations, registry }),
        ),
    }),
);

const removeAgent = ({
  input,
  installations,
  registry,
}: {
  input: AgentRemovalInput;
  installations: AgentInstallations;
  registry: RegistryDeps;
}): Promise<void> =>
  'id' in input
    ? changeAgentServer(registry, input.id, 'remove')
    : installations.remove(input.agentId);
