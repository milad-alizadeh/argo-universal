import { MachineTools, ToolInstallInput } from '@repo/contracts';
import { publicProcedure, router, routerFactory } from '../rpc';
import type { AgentInstallations } from './install/lifecycle/operations';
import { lookForTools } from './resolver/machine-tools';

type ToolsDeps = {
  installations: AgentInstallations;
  sessionCommandSignal?: AbortSignal;
};

// Which install tools are on this machine, and Homebrew installing a missing one.
export const createToolsRouter = routerFactory((deps: ToolsDeps) =>
  router({
    tools: publicProcedure.output(MachineTools).query(() => lookForTools()),
    installTool: publicProcedure
      .input(ToolInstallInput)
      .output(MachineTools)
      .mutation(async ({ input }) => {
        deps.sessionCommandSignal?.throwIfAborted();
        await deps.installations.tools.install(input.tool);

        return lookForTools();
      }),
  }),
);
