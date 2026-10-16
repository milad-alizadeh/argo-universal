import {
  PluginRequest,
  type PluginValue,
  type WorkerCall,
  type WorkerReply,
} from './runtime-protocol.ts';

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
 * reaches Plugin code (and with it no path to this realm's `Function`). `argoSource`
 * wraps it inside the context, then removes it.
 */
export const argoBridge =
  (calls: WorkerCalls): ArgoBridge =>
  async (json) => {
    const value = await calls.call(PluginRequest.parse(JSON.parse(json)));

    return JSON.stringify(value ?? null);
  };

export const argoSource = `(() => {
  const bridge = globalThis.__argoBridge;
  delete globalThis.__argoBridge;
  const call = async (request) => {
    try {
      return JSON.parse(await bridge(JSON.stringify(request)));
    } catch (error) {
      throw new Error(String(error && error.message));
    }
  };
  const secret = async (call_) => (await call({ api: 'secrets', call: call_ })) ?? null;
  return Object.freeze({
    storage: Object.freeze({
      batch: (queries) => call({ api: 'storage', queries }),
      execute: async (query) => (await call({ api: 'storage', queries: [query] }))[0],
    }),
    secrets: Object.freeze({
      get: (account) => secret({ action: 'get', account }),
      set: async (account, value) => { await secret({ action: 'set', account, value }); },
      delete: async (account) => { await secret({ action: 'delete', account }); },
    }),
  });
})()`;
