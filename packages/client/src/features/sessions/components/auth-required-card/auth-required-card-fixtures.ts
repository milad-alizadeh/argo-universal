import type { AuthRequiredCardProps } from './auth-required-card';

// A story supplies Authenticate; a fixture is what the card says.
type AuthRequiredCardFixture = Omit<AuthRequiredCardProps, 'onAuthenticate'>;

// No words from the Agent: the card falls back to the Contracts message.
export const authRequired = {} satisfies AuthRequiredCardFixture;

export const agentMessageAuthRequired = {
  description: 'Your ChatGPT session expired. Sign in again to continue.',
} satisfies AuthRequiredCardFixture;
