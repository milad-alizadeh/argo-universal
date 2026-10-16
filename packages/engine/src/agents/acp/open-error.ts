import { RequestError } from '@agentclientprotocol/sdk';
import type { SessionOpenError } from '@repo/contracts';
import { AgentProcessExitError } from './process';

export const isAuthRequired = (cause: unknown): boolean =>
  cause instanceof RequestError &&
  cause.code === RequestError.authRequired().code;

export const sessionOpenError = (cause: unknown): SessionOpenError => {
  if (isAuthRequired(cause)) return { type: 'auth-required' };

  return { type: 'failed', message: failureMessage(cause) };
};

const failureMessage = (cause: unknown): string => {
  if (cause instanceof AgentProcessExitError)
    return [cause.message, cause.stderr].filter(Boolean).join('\n');

  return cause instanceof Error ? cause.message : String(cause);
};

export const authenticationDescription = (
  cause: unknown,
): string | undefined => {
  if (!(cause instanceof RequestError) || !isAuthRequired(cause)) return;

  return descriptionOf(cause);
};

const descriptionOf = (cause: RequestError): string | undefined =>
  cause.message === RequestError.authRequired().message
    ? undefined
    : cause.message;
