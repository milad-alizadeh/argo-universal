import { AsyncLocalStorage } from 'node:async_hooks';
import type { OperationScope } from '../kit/operation-scope.ts';
import {
  PluginRequest,
  type PluginValue,
  type WorkerCall,
  type WorkerReply,
} from '../protocol/runtime.ts';

type CallOrigin = { viewId?: string | null; projectId?: string };

type Pending = {
  resolve: (value: PluginValue) => void;
  reject: (error: Error) => void;
};

// Sends each `argo` call to the Server through the plugin host and waits for its reply.
export class WorkerCalls {
  private readonly pending = new Map<number, Pending>();
  private readonly send: (message: WorkerCall) => void;
  private next = 0;

  constructor(send: (message: WorkerCall) => void) {
    this.send = send;
  }

  call(request: PluginRequest, origin: CallOrigin = {}): Promise<PluginValue> {
    const id = this.next++;

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.send({
        type: 'call',
        id,
        request,
        ...origin,
        viewId: origin.viewId ?? undefined,
      });
    });
  }

  settle(message: WorkerReply): void {
    const pending = this.pending.get(message.id);
    this.pending.delete(message.id);

    if (pending) settleWith(pending, message);
  }
}

function settleWith(pending: Pending, { reply }: WorkerReply): void {
  if (reply.ok) pending.resolve(reply.value);
  else pending.reject(new Error(reply.error));
}

export type PluginBridge = ((json: string) => Promise<string>) & {
  inView?: <T>(viewId: string | null, run: () => T) => T;
  inProject?: <T>(projectId: string | undefined, run: () => T) => T;
  operations?: OperationScope;
};

/*
 * The only host function a Plugin's context ever holds, and the context never sees it:
 * it takes and returns JSON strings, so no object, promise or error from this realm
 * reaches Plugin code (and with it no path to this realm's `Function`). The Plugin API
 * (`plugin-api.ts`) wraps it inside the context, then removes it.
 */
export function createPluginBridge(calls: WorkerCalls): PluginBridge {
  const scope = new AsyncLocalStorage<CallOrigin>();

  return Object.assign(bridgeCall(calls, scope), {
    inView: <T>(viewId: string | null, run: () => T): T =>
      scope.run({ viewId }, run),
    inProject: <T>(projectId: string | undefined, run: () => T): T =>
      scope.run({ projectId }, run),
    operations: operationScope(),
  });
}

const bridgeCall =
  (calls: WorkerCalls, scope: AsyncLocalStorage<CallOrigin>) =>
  async (json: string): Promise<string> => {
    const value = await calls.call(
      PluginRequest.parse(JSON.parse(json)),
      scope.getStore() ?? undefined,
    );

    return JSON.stringify(value ?? null);
  };

// The Operation invocation a handler answers, kept apart from the call origin it never changes.
function operationScope(): OperationScope {
  const operation = new AsyncLocalStorage<number>();

  return {
    run: (id, run) => operation.run(id, run),
    current: () => operation.getStore() ?? null,
  };
}
