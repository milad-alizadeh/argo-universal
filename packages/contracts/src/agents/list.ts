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

// One check's result; the reason is sanitized and never holds a credential. `agentVersion` is the version the Agent reported in ACP agentInfo.
export const AgentCheck = z.strictObject({
  status: AgentReadinessStatus,
  reason: z.string().optional(),
  agentVersion: z.string().optional(),
});

export type AgentCheck = z.infer<typeof AgentCheck>;

// `checking` until a check has finished; `not-installed` when no release is selected; `update-available` when a Ready copy's version differs from the catalog's.
export const AgentStatus = z.enum([
  'checking',
  ...AgentReadinessStatus.options,
  'update-available',
  'not-installed',
]);

export type AgentStatus = z.infer<typeof AgentStatus>;

// `refresh` checks every installed, enabled Agent again before answering.
export const AgentsListInput = z
  .strictObject({ refresh: z.boolean().optional() })
  .optional();

export type AgentsListInput = z.infer<typeof AgentsListInput>;

// Who owns the copy the Resolver found, derived from where its file really is: Argo's own folder, a Homebrew Cellar, npm's global packages, or anything else.
export const InstallationOwner = z.enum(['argo', 'homebrew', 'npm', 'unknown']);

export type InstallationOwner = z.infer<typeof InstallationOwner>;

export const AgentInfo = z.strictObject({
  agent: sessionColumns.shape.agent,
  label: z.string(),
  logo: z.string(),
  // The Adapter: the version of the program Argo launches, from its installed package or else its ACP agentInfo.
  version: z.string().optional(),
  // The Agent: the version its ACP agentInfo reported, only when it differs from the Adapter's.
  agentVersion: z.string().optional(),
  // The catalog's release.
  availableVersion: z.string().optional(),
  enabled: z.boolean(),
  status: AgentStatus,
  reason: z.string().optional(),
  // Set while the Resolver last found a copy on this machine.
  owner: InstallationOwner.optional(),
  // Where a copy Argo did not install is, for the user to update it there.
  path: z.string().optional(),
  // For Update available on a copy Homebrew or npm owns: the command the user runs to update it. Argo never runs it.
  updateCommand: z.string().optional(),
});

export type AgentInfo = z.infer<typeof AgentInfo>;

export const AgentsListOutput = z.array(AgentInfo);

export type AgentsListOutput = z.infer<typeof AgentsListOutput>;
