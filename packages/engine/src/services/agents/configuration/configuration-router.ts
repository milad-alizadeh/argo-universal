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
import { publicProcedure } from '../../../engine/trpc';
import {
  checkConfiguredAgent,
  editCustomAgent,
  registerCustomAgent,
  setAgentEnabled,
} from './configuration-commands';
import { readConfiguredAgents } from './configuration-sql';

export const configurationProcedures = {
  configured: publicProcedure
    .output(z.array(ConfiguredAgent))
    .query(({ ctx }) => readConfiguredAgents(ctx.database)),
  check: publicProcedure
    .input(AgentId)
    .output(AgentCheck)
    .query(({ ctx, input }) => checkConfiguredAgent(ctx, input.agentId)),
  registerCustom: publicProcedure
    .input(CustomAgentDefinition)
    .output(AgentRegistration)
    .mutation(({ ctx, input }) => registerCustomAgent(ctx, input)),
  editCustom: publicProcedure
    .input(CustomAgentEditInput)
    .output(AgentRegistration)
    .mutation(({ ctx, input }) => editCustomAgent(ctx, input)),
  setEnabled: publicProcedure
    .input(AgentEnablementInput)
    .mutation(({ ctx, input }) => setAgentEnabled(ctx, input)),
};
