import { TRPCError } from '@trpc/server';
import { ChoiceNotOffered } from '../configuration';

// A choice the Agent did not offer is the caller's mistake: a bad request.
export function asRequestError(error: Error): never {
  if (error instanceof ChoiceNotOffered)
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: error.message,
      cause: error,
    });

  throw error;
}
