import type { CallOrigin, CallScope } from '../protocol/call-origin.ts';
import {
  PluginRequest,
  type PluginValue,
  type WorkerCall,
  type WorkerReply,
} from '../protocol/runtime.ts';

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

  call(request: PluginRequest, origin: CallOrigin): Promise<PluginValue> {
    const id = this.next++;

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.send({
        type: 'call',
        id,
        request,
        origin,
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

// `origin` tells the kit what the running code is for, as `argo.changed()` inside an Operation joins its mark.
export type PluginBridge = ((json: string) => Promise<string>) & {
  origin: () => CallOrigin;
};

/*
 * The only host function a Plugin's context ever holds, and the context never sees it:
 * it takes and returns JSON strings, so no object, promise or error from this realm
 * reaches Plugin code (and with it no path to this realm's `Function`). The Plugin API
 * (`plugin-api.ts`) wraps it inside the context, then removes it. Each call carries the
 * origin of the delivery its code runs in.
 */
export function createPluginBridge(
  calls: WorkerCalls,
  scope: CallScope,
): PluginBridge {
  const origin = (): CallOrigin => scope.current();

  return Object.assign(bridgeCall(calls, origin), { origin });
}

const bridgeCall =
  (calls: WorkerCalls, origin: () => CallOrigin) =>
  async (json: string): Promise<string> => {
    const value = await calls.call(
      PluginRequest.parse(JSON.parse(json)),
      origin(),
    );

    return JSON.stringify(value ?? null);
  };
