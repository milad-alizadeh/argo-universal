import type { AgentCheck } from '@repo/contracts';
import type { AgentLaunchSubject } from '..';
import { MissingAcpCapabilityError } from './initialize';

export const answerTimeoutMs = 15_000;
const millisecondsPerSecond = 1000;
export class CheckTimeout extends Error {
  public constructor(public readonly milliseconds: number) {
    super('ACP initialize timed out');
  }
}

const spawnFailures = new Map<unknown, string>([
  ['ENOENT', 'was not found.'],
  ['EACCES', 'cannot be run.'],
]);
const readErrorCode = (error: unknown): unknown =>
  error instanceof Error && 'code' in error ? error.code : null;
const describeSpawnFailure = (
  error: unknown,
  { launch }: AgentLaunchSubject,
): string | undefined => {
  const failure = spawnFailures.get(readErrorCode(error));
  return failure && `${launch.executable} ${failure}`;
};
export const describeError = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);
export const cantStart = (reason: string): AgentCheck => ({
  status: 'cant-start',
  reason,
});
type FailureReader = (
  error: unknown,
  subject: AgentLaunchSubject,
) => AgentCheck | undefined;
const failureReaders: readonly FailureReader[] = [
  (error, { name }) =>
    error instanceof MissingAcpCapabilityError
      ? {
          status: 'not-compatible',
          reason: `${name} does not support the ACP ${error.capability} capability Argo needs.`,
        }
      : undefined,
  (error, { name }) =>
    error instanceof CheckTimeout
      ? cantStart(
          `${name} did not answer ACP initialize within ${error.milliseconds / millisecondsPerSecond} seconds.`,
        )
      : undefined,
  (error, subject) => {
    const failure = describeSpawnFailure(error, subject);
    return failure ? cantStart(failure) : undefined;
  },
];
// The named failures a readiness check recognises; anything else is reported by the caller.
export const describeKnownFailure = (
  error: unknown,
  subject: AgentLaunchSubject,
): AgentCheck | undefined =>
  failureReaders
    .map((read) => read(error, subject))
    .find((check) => check !== undefined);
export const launchFailure = (
  error: unknown,
  subject: AgentLaunchSubject,
): AgentCheck =>
  cantStart(
    describeSpawnFailure(error, subject) ??
      `${subject.name} could not be started: ${describeError(error)}`,
  );
