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

  call(request: PluginRequest): Promise<PluginValue> {
    const id = this.next++;

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.send({ type: 'call', id, request });
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

export type ArgoBridge = (json: string) => Promise<string>;

/*
 * The only host function a Plugin's context ever holds, and the context never sees it:
 * it takes and returns JSON strings, so no object, promise or error from this realm
 * reaches Plugin code (and with it no path to this realm's `Function`). The Plugin API
 * (`plugin-api.ts`) wraps it inside the context, then removes it.
 */
export const argoBridge =
  (calls: WorkerCalls): ArgoBridge =>
  async (json) => {
    const value = await calls.call(PluginRequest.parse(JSON.parse(json)));

    return JSON.stringify(value ?? null);
  };
