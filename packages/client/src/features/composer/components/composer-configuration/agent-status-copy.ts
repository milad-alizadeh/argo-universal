import type { AgentStatus } from '@repo/contracts';

export interface AgentStatusCopy {
  label: string;
  button?: string;
  // Recheck runs in place; setup opens the Agent's page.
  action?: 'setup' | 'recheck';
  // Can't start names what the check observed, already sanitized by the Server.
  showsReason?: boolean;
}

const copies: Partial<Record<AgentStatus, AgentStatusCopy>> = {
  'sign-in-needed': {
    label: 'Sign-in needed',
    button: 'Sign in',
    action: 'setup',
  },
  'account-not-supported': {
    label: 'Account not supported',
    button: 'Sign in with another account',
    action: 'setup',
  },
  'not-compatible': { label: 'Not compatible' },
  'cant-start': {
    label: 'Can’t start',
    button: 'Recheck',
    action: 'recheck',
    showsReason: true,
  },
  'couldnt-check': {
    label: 'Couldn’t check',
    button: 'Recheck',
    action: 'recheck',
  },
  'not-found': { label: 'Not found', button: 'Repair', action: 'setup' },
  'not-installed': {
    label: 'Not installed',
    button: 'Install',
    action: 'setup',
  },
};

// What the picker says under an Agent that cannot start a Session yet, and its one action; Ready and Checking… say nothing.
export const agentStatusCopy = (
  status: AgentStatus,
): AgentStatusCopy | undefined => copies[status];
