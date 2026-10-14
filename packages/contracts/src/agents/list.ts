import { z } from 'zod';
import { sessionColumns } from '../columns';

// What the shared ACP initialize and authentication check observed (Readiness).
export const AgentReadinessStatus = z.enum([
  'ready',
  'sign-in-needed',
  'account-not-supported',
  'not-compatible',
  'cant-start',
  'couldnt-check',
  'not-found',
]);

export type AgentReadinessStatus = z.infer<typeof AgentReadinessStatus>;

// One check's result; the reason is sanitized and never holds a credential.
export const AgentCheck = z.strictObject({
  status: AgentReadinessStatus,
  reason: z.string().optional(),
});

export type AgentCheck = z.infer<typeof AgentCheck>;

// `checking` until a check has finished; `not-installed` when no release is selected.
export const AgentStatus = z.enum([
  'checking',
  ...AgentReadinessStatus.options,
  'not-installed',
]);

export type AgentStatus = z.infer<typeof AgentStatus>;

// `refresh` checks every installed, enabled Agent again before answering.
export const AgentsListInput = z
  .strictObject({ refresh: z.boolean().optional() })
  .optional();

export type AgentsListInput = z.infer<typeof AgentsListInput>;

// Who owns the copy the Resolver found, derived from its path: Argo's own folder, or anything else.
export const InstallationOwner = z.enum(['argo', 'unknown']);

export type InstallationOwner = z.infer<typeof InstallationOwner>;

export const AgentInfo = z.strictObject({
  agent: sessionColumns.shape.agent,
  label: z.string(),
  logo: z.string(),
  version: z.string().optional(),
  availableVersion: z.string().optional(),
  enabled: z.boolean(),
  status: AgentStatus,
  reason: z.string().optional(),
  // Set while the Resolver last found a copy on this machine.
  owner: InstallationOwner.optional(),
});

export type AgentInfo = z.infer<typeof AgentInfo>;

export const AgentsListOutput = z.array(AgentInfo);

export type AgentsListOutput = z.infer<typeof AgentsListOutput>;
