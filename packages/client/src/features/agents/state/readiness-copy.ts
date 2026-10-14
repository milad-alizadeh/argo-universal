import type { AgentStatus } from './agent-status';

// The one thing the user can do about a status; Not compatible and Checking… have none.
export type ReadinessAction =
  | 'sign-in'
  | 'sign-in-again'
  | 'recheck'
  | 'repair';

export const readinessActionLabels: Record<ReadinessAction, string> = {
  'sign-in': 'Sign in',
  'sign-in-again': 'Sign in with another account',
  recheck: 'Recheck',
  repair: 'Repair',
};

export interface ReadinessCopy {
  action?: ReadinessAction;
  // The observed reason, or what the status means when the Server gave none.
  footer?: string;
  // Can't start reads as a failure; the other statuses read as plain notes.
  failure?: boolean;
}

type CopyInput = { name: string; status: AgentStatus; reason?: string };

type CopyWriter = (input: CopyInput) => ReadinessCopy;

const copies: Partial<Record<AgentStatus, CopyWriter>> = {
  checking: ({ name }) => ({
    footer: `Argo is starting ${name} to see whether it is ready.`,
  }),
  'sign-in-needed': ({ reason }) => ({
    action: 'sign-in',
    footer: reason,
  }),
  'account-not-supported': ({ name, reason }) => ({
    action: 'sign-in-again',
    footer: reason,
  }),
  'not-compatible': ({ reason }) => ({
    footer: reason,
  }),
  'cant-start': ({ reason }) => ({
    action: 'recheck',
    footer: reason,
    failure: true,
  }),
  // An indeterminate check is never a failure: the Agent may still work.
  'couldnt-check': ({ name }) => ({
    action: 'recheck',
    footer: `The check did not finish. ${name} may still work.`,
  }),
  'not-found': ({ reason }) => ({
    action: 'repair',
    footer: reason,
  }),
};

// The Status section's words for an Agent's Readiness; Ready, Update available and Not installed need none.
export const readinessCopy = (input: CopyInput): ReadinessCopy | undefined =>
  copies[input.status]?.(input);
