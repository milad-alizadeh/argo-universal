import { z } from 'zod';
import { agentAccessColumns } from '../columns';

export const AgentAccess = agentAccessColumns.pick({ enabled: true });

export type AgentAccess = z.infer<typeof AgentAccess>;

export const agentAccessOperations = {
  'agent.getAccess': {
    id: 'agent.getAccess',
    label: 'Read Agent access',
    description:
      'Read whether new Sessions receive Argo tools, the CLI and their own token.',
    params: z.strictObject({}).default({}),
    result: AgentAccess,
    tier: 'read',
    keywords: ['settings', 'token', 'cli', 'access'],
  },
  'agent.setAccess': {
    id: 'agent.setAccess',
    label: 'Change Agent access',
    description:
      'Turn Argo access on or off for new Sessions. Existing Sessions keep their access.',
    params: AgentAccess.strict(),
    result: AgentAccess,
    tier: 'confirm',
    keywords: ['settings', 'token', 'cli', 'enable', 'disable'],
  },
  'agent.installInstructions': {
    id: 'agent.installInstructions',
    label: 'Add Argo to your Agents',
    description:
      'Optionally install CLI instructions and a Codex allow rule for Agents run outside Argo. No Project files are changed.',
    params: z.strictObject({}).default({}),
    result: z.strictObject({ updated: z.boolean() }),
    tier: 'confirm',
    keywords: ['settings', 'skill', 'instructions', 'sandbox'],
  },
} as const;
