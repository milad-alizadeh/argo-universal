import { z } from 'zod';
import { agentAccessColumns } from '../columns';
import { productName } from '../product-identity';

export const AgentAccess = agentAccessColumns.pick({ enabled: true });

export type AgentAccess = z.infer<typeof AgentAccess>;

// An Operation the person chose Always allow for: Sessions in this Project run it without asking again.
export const OperationGrant = z.strictObject({
  projectId: z.string(),
  projectName: z.string(),
  operationId: z.string(),
  label: z.string(),
  createdAt: z.number(),
});

export type OperationGrant = z.infer<typeof OperationGrant>;

const OperationGrantTarget = OperationGrant.pick({
  projectId: true,
  operationId: true,
}).strict();

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
  'agent.listGrants': {
    id: 'agent.listGrants',
    label: 'List Always allow grants',
    icon: 'key',
    description:
      'List the Operations the person chose Always allow for, with the Project whose Sessions run them without asking.',
    params: z.strictObject({}).default({}),
    result: z.array(OperationGrant),
    tier: 'read',
    policy: 'person-only',
    keywords: ['settings', 'permission', 'always allow', 'grant'],
  },
  'agent.revokeGrant': {
    id: 'agent.revokeGrant',
    label: 'Revoke Always allow',
    icon: 'key',
    description:
      'Revoke an Always allow grant, so Sessions in its Project ask before running the Operation again.',
    params: OperationGrantTarget,
    result: z.strictObject({}),
    tier: 'act',
    policy: 'person-only',
    keywords: ['settings', 'permission', 'always allow', 'revoke'],
  },
} as const;
