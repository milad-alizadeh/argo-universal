import { RequestError } from '@agentclientprotocol/sdk';
import type { SessionOpenError } from '@repo/contracts';
import { AgentProcessExitError } from './process';

export const isAuthRequired = (cause: unknown): cause is RequestError =>
  cause instanceof RequestError &&
  cause.code === RequestError.authRequired().code;

export const sessionOpenError = (cause: unknown): SessionOpenError => {
  if (isAuthRequired(cause)) return { type: 'auth-required' };

  return { type: 'failed', message: failureMessage(cause) };
};

/*
 * Zed's `trailing_stderr`: the stderr lines since the Agent's last message,
 * without empty lines. The process buffer already restarts at each message.
 */
const lastStderrBlock = (stderr: string): string =>
  stderr
    .split(/\r?\n/)
    .filter((line) => line !== '')
    .join('\n');

const failureMessage = (cause: unknown): string => {
  if (cause instanceof AgentProcessExitError) return exitMessage(cause);

  return cause instanceof Error ? cause.message : String(cause);
};

const exitMessage = (cause: AgentProcessExitError): string => {
  const { title, description } = cause.notice;

  return [
    title,
    cause.missingExecutable ? description : lastStderrBlock(cause.stderr),
  ]
    .filter(Boolean)
    .join('\n');
};

export const authenticationDescription = (
  cause: unknown,
): string | undefined => {
  if (!isAuthRequired(cause)) return;

  return descriptionOf(cause);
};

const descriptionOf = (cause: RequestError): string | undefined =>
  cause.message === RequestError.authRequired().message
    ? undefined
    : cause.message;
