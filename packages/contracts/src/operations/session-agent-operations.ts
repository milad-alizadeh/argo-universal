import {
  SessionDeclareSubagentRoleInput,
  SessionDeclareSubagentRoleOutput,
} from '../sessions/declare-subagent-role';
import type { OperationDefinition } from './index';

// The Operations an Agent runs about the Agents it spawns.
export const sessionAgentOperations = {
  'session.declareSubagentRole': {
    id: 'session.declareSubagentRole',
    label: 'Declare Agent role',
    description:
      'Before spawning a subagent, name its role; each spawn takes the next declared role, and Argo draws that role for the Agent.',
    params: SessionDeclareSubagentRoleInput,
    result: SessionDeclareSubagentRoleOutput,
    tier: 'act',
    keywords: ['subagent', 'spawn', 'role', 'agent', 'type'],
  },
} as const satisfies Record<string, OperationDefinition>;
