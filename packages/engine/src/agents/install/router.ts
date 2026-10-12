import {
  AgentId,
  AgentInstallInput,
  AgentInstallCancelInput,
  AgentInstallOperation,
  AgentInstallStatus,
} from '@repo/contracts';
import { publicProcedure, router, routerFactory } from '../../rpc';
import type { AgentInstallations } from './lifecycle/operations';
export const createInstallRouter = routerFactory(
  (installations: AgentInstallations) =>
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
