import type { AgentCheck } from '@repo/contracts';
import { z } from 'zod';
import type { AgentLaunchSubject } from '..';
import { MissingAcpCapabilityError } from './initialize';

export const answerTimeoutMs = 15_000;

const millisecondsPerSecond = 1000;

export class CheckTimeout extends Error {
  public constructor(public readonly milliseconds: number) {
    super('ACP initialize timed out');
  }
}

const spawnFailures = new Map([
  ['ENOENT', 'was not found.'],
  ['EACCES', 'cannot be run.'],
]);

// Node spawn errors carry a string `code`; every other thrown value has none.
const spawnErrorSchema = z.object({ code: z.string() });

const describeSpawnFailure = (
  cause: unknown,
  { launch }: AgentLaunchSubject,
): string | undefined => {
  const spawnError = spawnErrorSchema.safeParse(cause);
  const failure = spawnError.success && spawnFailures.get(spawnError.data.code);

  return failure ? `${launch.executable} ${failure}` : undefined;
};

export const describeError = (cause: unknown): string =>
  cause instanceof Error ? cause.message : String(cause);

export const cantStart = (reason: string): AgentCheck => ({
  status: 'cant-start',
  reason,
});

type FailureReader = (
  cause: unknown,
  subject: AgentLaunchSubject,
) => AgentCheck | undefined;

const failureReaders: readonly FailureReader[] = [
  (cause, { name }) =>
    cause instanceof MissingAcpCapabilityError
      ? {
          status: 'not-compatible',
          reason: `${name} does not support the ACP ${cause.capability} capability Argo needs.`,
        }
      : undefined,
  (cause, { name }) =>
    cause instanceof CheckTimeout
      ? cantStart(
          `${name} did not answer ACP initialize within ${cause.milliseconds / millisecondsPerSecond} seconds.`,
        )
      : undefined,
  (cause, subject) => {
    const failure = describeSpawnFailure(cause, subject);

    return failure ? cantStart(failure) : undefined;
  },
];

// The named failures a readiness check recognises; anything else is reported by the caller.
export const describeKnownFailure = (
  cause: unknown,
  subject: AgentLaunchSubject,
): AgentCheck | undefined =>
  failureReaders
    .map((read) => read(cause, subject))
    .find((check) => check !== undefined);

export const launchFailure = (
  cause: unknown,
  subject: AgentLaunchSubject,
): AgentCheck =>
  cantStart(
    describeSpawnFailure(cause, subject) ??
      `${subject.name} could not be started: ${describeError(cause)}`,
  );
