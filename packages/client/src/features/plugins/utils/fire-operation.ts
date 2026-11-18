import type { OperationRunner } from './page-calls-ports';

// Told how the Operation ended: it answered, or it failed and the failure was said.
export type OperationSettled = (answered: boolean) => void;

export type FireOperation = (
  scoped: Parameters<OperationRunner['run']>[0],
  settled?: OperationSettled,
) => void;

export const toError = (cause: unknown): Error =>
  cause instanceof Error ? cause : new Error(String(cause));

/*
 * Runs an Operation nobody waits for: a rejection is said through `failed`, as an Error, and never escapes. A caller
 * that showed the result ahead of the answer passes `settled`, to keep it or take it back.
 */
export const fireOperation =
  ({ run, failed }: OperationRunner): FireOperation =>
  (scoped, settled) => {
    run(scoped).then(
      () => settled?.(true),
      (cause: unknown) => {
        settled?.(false);
        failed(toError(cause));
      },
    );
  };
