import { operations, type OperationId } from '@repo/contracts/operations';
import type { Json } from '@repo/contracts/plugins/hook-protocol';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import type { OperationParams, OperationResult } from './implementations';

type OperationInput =
  | z.input<(typeof operations)[OperationId]['params']>
  | Json;

function operationParams<Schema extends z.ZodType>(
  schema: Schema,
  params: OperationInput,
): z.output<Schema> {
  try {
    return schema.parse(params);
  } catch (cause) {
    if (!(cause instanceof z.ZodError)) throw cause;
    throw new TRPCError({ code: 'BAD_REQUEST', message: cause.message, cause });
  }
}

// The registry read per Operation id, so a generic id keeps its own params and result types.
const schemas: {
  [Id in OperationId]: {
    params: z.ZodType<OperationParams<Id>>;
    result: z.ZodType<OperationResult<Id>>;
  };
} = operations;

// The Server takes any id and looks it up, so an unknown one is a caller's usage error.
export function requireOperationId(id: string): OperationId {
  const known = Object.values(operations).find(
    (operation) => operation.id === id,
  );

  if (!known)
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Unknown Operation ${id}. Run argo operations to find one.`,
    });

  return known.id;
}

export function validateParams<Id extends OperationId>(
  id: Id,
  params: Json,
): OperationParams<Id> {
  return operationParams(schemas[id].params, params);
}

// An implementation's typed result still passes its registry result before it leaves the Server.
export function parseResult<Id extends OperationId>(
  id: Id,
  result: OperationResult<Id>,
): Promise<OperationResult<Id>> {
  return schemas[id].result.parseAsync(result);
}
