import type { AgentAuthenticateOutput } from '@repo/contracts';

export const authenticationFailed = (
  cause: unknown,
): AgentAuthenticateOutput => ({
  status: 'failed',
  message: cause instanceof Error ? cause.message : String(cause),
});
