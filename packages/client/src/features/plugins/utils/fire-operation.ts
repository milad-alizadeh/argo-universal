import type { OperationRunner } from './page-calls-ports';

export type FireOperation = (
  scoped: Parameters<OperationRunner['run']>[0],
) => void;

export const toError = (cause: unknown): Error =>
  cause instanceof Error ? cause : new Error(String(cause));

// Runs an Operation nobody waits for: a rejection is said through `failed`, as an Error, and never escapes.
export const fireOperation =
  ({ run, failed }: OperationRunner): FireOperation =>
  (scoped) => {
    run(scoped).catch((cause: unknown) => failed(toError(cause)));
  };
