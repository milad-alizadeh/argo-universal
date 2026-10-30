import type { OperationHandler } from '@repo/contracts/plugins/operations-api';
import type { PluginOperationCall } from '@repo/contracts/plugins/plugin-operations';
import type { PluginEvent, WireJson } from '@repo/contracts/plugins/wire';

type OperationEvent = Extract<PluginEvent, { type: 'operation' }>;

export type OperationSend = (call: PluginOperationCall) => Promise<void>;

export interface OperationHandlers {
  register: (name: string, handler: OperationHandler) => void;
  answer: (event: OperationEvent) => void;
}

/*
 * The handlers a Plugin registered for its declared Operations; each invocation is answered by its id,
 * or failed with why. Core checked the params against the manifest before the handler sees them.
 */
export function operationHandlers(send: OperationSend): OperationHandlers {
  const handlers = new Map<string, OperationHandler>();

  return {
    register: (name, handler) => handlers.set(name, handler),
    answer: (event) => void answer(send, handlers.get(event.name), event),
  };
}

async function answer(
  send: OperationSend,
  handler: OperationHandler | undefined,
  event: OperationEvent,
): Promise<void> {
  try {
    const result = await resultOf(handler, event);

    await send({ action: 'result', id: event.id, result });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);

    await failed(send, event.id, reason);
  }
}

// A handler that threw fails its own invocation; nothing is left to say when even that cannot be sent.
const failed = (
  send: OperationSend,
  id: number,
  error: string,
): Promise<void | null> =>
  send({ action: 'failed', id, error }).catch(() => null);

// Only JSON leaves the realm, so the Server answers the very result the handler returned.
async function resultOf(
  handler: OperationHandler | undefined,
  { name, params, caller }: OperationEvent,
): Promise<WireJson> {
  if (!handler) throw new Error(`no handler registered for ${name}`);

  const given = Object.freeze({ ...params });

  return JSON.parse(
    JSON.stringify((await handler(given, Object.freeze(caller))) ?? null),
  );
}
