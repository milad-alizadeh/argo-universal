import type { AppRouter } from '@repo/engine/router';
import { isTRPCClientError, type TRPCClientError } from '@trpc/client';
import { z } from 'zod';

class UsageError extends Error {}

export function parseUsage<T>(parse: () => T): T {
  try {
    return parse();
  } catch (error) {
    throw new UsageError(String(error));
  }
}

export function commandExitCode(cause: unknown): number {
  const parsed = z.instanceof(Error).safeParse(cause);

  return parsed.success ? failureExitCode(parsed.data) : 1;
}

function failureExitCode(error: Error): number {
  if (error instanceof UsageError) return 2;

  if (isTRPCClientError<AppRouter>(error)) return serverExitCode(error);

  return 1;
}

// The Server refuses invalid params and an unknown Operation id as a bad request: both are usage.
function serverExitCode(error: TRPCClientError<AppRouter>): number {
  return error.data?.code === 'BAD_REQUEST' ? 2 : 1;
}
