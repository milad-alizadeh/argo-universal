import { z } from 'zod';
import { agentAccessColumns } from '../columns';
import { productName } from '../product-identity';

export const AgentAccess = agentAccessColumns.pick({ enabled: true });

export type AgentAccess = z.infer<typeof AgentAccess>;

export const agentAccessOperations = {
  'agent.getAccess': {
    id: 'agent.getAccess',
    label: 'Read Agent access',
    icon: 'key',
    description: `Read whether new Sessions receive ${productName} tools, the CLI and their own token.`,
    params: z.strictObject({}).default({}),
    result: AgentAccess,
    tier: 'read',
    policy: 'allow',
    keywords: ['settings', 'token', 'cli', 'access'],
  },
  'agent.setAccess': {
    id: 'agent.setAccess',
    label: 'Change Agent access',
    icon: 'key',
    description: `Turn ${productName} access on or off for new Sessions. Existing Sessions keep their access.`,
    params: AgentAccess.strict(),
    result: AgentAccess,
    tier: 'confirm',
    policy: 'ask',
    keywords: ['settings', 'token', 'cli', 'enable', 'disable'],
  },
  'agent.installInstructions': {
    id: 'agent.installInstructions',
    label: `Add ${productName} to your Agents`,
    icon: 'guide',
    description: `Optionally install CLI instructions and a Codex allow rule for Agents run outside ${productName}. No Project files are changed.`,
    params: z.strictObject({}).default({}),
    result: z.strictObject({ updated: z.boolean() }),
    tier: 'confirm',
    policy: 'ask',
    keywords: ['settings', 'skill', 'instructions', 'sandbox'],
  },
} as const;
