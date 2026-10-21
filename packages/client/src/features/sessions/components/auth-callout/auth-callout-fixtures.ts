import type { AuthCalloutProps } from './auth-callout';
import { authCallouts } from './auth-callout.mocks';

// A story supplies the callbacks; a fixture is the Agent, its methods and where the sign-in stands.
type AuthCalloutFixture = Omit<AuthCalloutProps, 'onAuthenticate' | 'onCancel'>;

export const oneMethodAuth = {
  ...authCallouts.oneMethod,
} satisfies AuthCalloutFixture;

export const agentMessageAuth = {
  ...authCallouts.agentMessage,
} satisfies AuthCalloutFixture;

export const severalMethodsAuth = {
  ...authCallouts.severalMethods,
} satisfies AuthCalloutFixture;

export const pendingAuth = {
  ...authCallouts.pending,
} satisfies AuthCalloutFixture;

export const failedAuth = {
  ...authCallouts.failed,
} satisfies AuthCalloutFixture;
