import type { InitializeResponse } from '@agentclientprotocol/sdk';
import type { AuthStatus } from '@repo/contracts';
import type { LoginAgentOutcome } from '../agents';

const subscriptionPlans = new Set([
  'go',
  'plus',
  'pro',
  'team',
  'business',
  'enterprise',
  'edu',
]);
const rejectedAccount: LoginAgentOutcome = {
  status: 'account-rejected',
  failure: 'The Agent did not report a compatible subscription account.',
};
const authCapability = (initialization: InitializeResponse): unknown => {
  const capabilities = initialization.agentCapabilities;
  if (!capabilities?._meta) return null;
  return capabilities._meta.authStatus;
};
export const reportsAuthStatus = (
  initialization: InitializeResponse,
): boolean => {
  const capability = authCapability(initialization);
  return typeof capability === 'object' && capability !== null;
};
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
