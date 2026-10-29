import { z } from 'zod';
import { sessionColumns } from '../columns';
import { SessionOpenError } from './new';
import { SessionConfigOption } from './set-config-option';

// Input of `session.agentOptions`: the Agent and Project the reader selected (ADR-0023).
const AgentOptionsOwner = z.strictObject({
  projectId: sessionColumns.shape.projectId,
  agent: sessionColumns.shape.agent,
});

export const SessionAgentOptionsInput = AgentOptionsOwner.extend({
  sessionId: sessionColumns.shape.id.optional(),
  picks: z.record(z.string(), z.union([z.string(), z.boolean()])).optional(),
});

export type SessionAgentOptionsInput = z.infer<typeof SessionAgentOptionsInput>;

// The Agent's options as a new Agent session in the Project folder reports them.
export const SessionAgentOptionsOutput = z.array(SessionConfigOption);

export type SessionAgentOptionsOutput = z.infer<
  typeof SessionAgentOptionsOutput
>;

export const SlashCommand = z.strictObject({
  name: z.string(),
  description: z.string(),
  hint: z.string().optional(),
});

export type SlashCommand = z.infer<typeof SlashCommand>;

export const AgentConfiguration = AgentOptionsOwner.extend({
  configOptions: SessionAgentOptionsOutput,
  commands: z.array(SlashCommand).nullable(),
});

export type AgentConfiguration = z.infer<typeof AgentConfiguration>;

// Null means discovery is running and the Server has no saved options yet.
export const AgentOptionsUpdate = z.strictObject({
  ...AgentOptionsOwner.shape,
  configOptions: SessionAgentOptionsOutput.nullable(),
  commands: z.array(SlashCommand).nullable(),
  stage: z.enum(['installing', 'loading', 'ready']).optional(),
  progress: z.number().min(0).max(1).optional(),
  error: SessionOpenError.optional(),
});

export type AgentOptionsUpdate = z.infer<typeof AgentOptionsUpdate>;
