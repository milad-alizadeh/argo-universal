import type { InitializeResponse } from '@agentclientprotocol/sdk';
import type { AuthStatus } from '@repo/contracts';
import { z } from 'zod';
import type { LoginAgentOutcome } from '..';

const subscriptionPlans = new Set([
  'go',
  'plus',
  'pro',
  'max',
  'Claude Max',
  'team',
  'business',
  'enterprise',
  'edu',
]);

const rejectedAccount: LoginAgentOutcome = {
  status: 'account-rejected',
  failure: 'The Agent did not report a compatible subscription account.',
};

// An Agent advertises account status reports with an object at `_meta.authStatus`.
const AuthStatusCapability = z.object({
  agentCapabilities: z.object({
    _meta: z.object({ authStatus: z.object({}) }),
  }),
});

export const reportsAuthStatus = (
  initialization: InitializeResponse,
): boolean => AuthStatusCapability.safeParse(initialization).success;

const accountPlan = (status: AuthStatus): string => status.account?.plan ?? '';

const accountOutcome = (status: AuthStatus): LoginAgentOutcome =>
  subscriptionPlans.has(accountPlan(status))
    ? { status: 'ready' }
    : rejectedAccount;

const reportedOutcome = (status: AuthStatus): LoginAgentOutcome => {
  switch (status.kind) {
    case 'none':
      return {
        status: 'authentication-required',
        failure: 'The Agent requires sign-in.',
      };
    case 'account':
      return accountOutcome(status);
    default:
      return rejectedAccount;
  }
};

export const subscriptionOutcome = (status?: AuthStatus): LoginAgentOutcome =>
  status ? reportedOutcome(status) : rejectedAccount;
