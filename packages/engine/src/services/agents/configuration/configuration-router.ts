import {
  AgentCheck,
  AgentEnablementInput,
  AgentId,
  AgentRegistration,
  ConfiguredAgent,
  CustomAgentDefinition,
  CustomAgentEditInput,
} from '@repo/contracts';
import { z } from 'zod';
import { mergeRouters, publicProcedure, routerFactory } from '../../../rpc';
import {
  checkConfiguredAgent,
  type ConfigurationDeps,
  editCustomAgent,
  registerCustomAgent,
  setAgentEnabled,
} from './configuration-commands';
import { readConfiguredAgents } from './configuration-sql';

const createConfigurationReadRouter = routerFactory(
  (deps: ConfigurationDeps) => ({
    configured: publicProcedure
      .output(z.array(ConfiguredAgent))
      .query(() => readConfiguredAgents(deps.database)),
    check: publicProcedure
      .input(AgentId)
      .output(AgentCheck)
      .query(({ input }) => checkConfiguredAgent(deps, input.agentId)),
  }),
);

const createConfigurationWriteRouter = routerFactory(
  (deps: ConfigurationDeps) => ({
    registerCustom: publicProcedure
      .input(CustomAgentDefinition)
      .output(AgentRegistration)
      .mutation(({ input }) => registerCustomAgent(deps, input)),
    editCustom: publicProcedure
      .input(CustomAgentEditInput)
      .output(AgentRegistration)
      .mutation(({ input }) => editCustomAgent(deps, input)),
    setEnabled: publicProcedure
      .input(AgentEnablementInput)
      .mutation(({ input }) => setAgentEnabled(deps, input)),
  }),
);

export type ConfigurationRouter = ReturnType<
  typeof mergeRouters<
    [
      ReturnType<typeof createConfigurationReadRouter>,
      ReturnType<typeof createConfigurationWriteRouter>,
    ]
  >
>;

export const createConfigurationRouter = (
  deps: ConfigurationDeps,
): ConfigurationRouter =>
  mergeRouters(
    createConfigurationReadRouter(deps),
    createConfigurationWriteRouter(deps),
  );
