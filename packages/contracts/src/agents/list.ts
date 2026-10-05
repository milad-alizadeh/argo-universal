import { z } from 'zod';
import { sessionColumns } from '../columns';
import { SessionConfigOption } from '../sessions/set-config-option';

export const AgentAvailability = z.enum([
  'available',
  'not_installed',
  'not_signed_in',
  'unavailable',
]);
export type AgentAvailability = z.infer<typeof AgentAvailability>;

// `refresh` probes every Agent again rather than answering from the last probe.
export const AgentsListInput = z
  .strictObject({ refresh: z.boolean().optional() })
  .optional();
export type AgentsListInput = z.infer<typeof AgentsListInput>;

export const AgentInfo = z.strictObject({
  agent: sessionColumns.shape.agent,
  label: z.string(),
  logo: z.string(),
  availability: AgentAvailability,
  installStep: z.string().optional(),
  configOptions: z.array(SessionConfigOption),
});
export type AgentInfo = z.infer<typeof AgentInfo>;

export const AgentsListOutput = z.array(AgentInfo);
export type AgentsListOutput = z.infer<typeof AgentsListOutput>;
