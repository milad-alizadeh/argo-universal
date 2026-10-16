import { z } from 'zod';
import type {
  PluginRequest,
  PluginValue,
  WorkerCall,
  WorkerReply,
} from './runtime-protocol.ts';
import { StorageResult, type StorageQuery } from './storage.ts';

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

  call<T>(request: PluginRequest, schema: z.ZodType<T>): Promise<T> {
    const id = this.next++;

    return new Promise<PluginValue>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.send({ type: 'call', id, request });
    }).then((value) => schema.parse(value));
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

export interface Argo {
  storage: {
    execute(query: StorageQuery): Promise<StorageResult>;
    batch(queries: StorageQuery[]): Promise<StorageResult[]>;
  };
  secrets: {
    get(account: string): Promise<string | null>;
    set(account: string, value: string): Promise<void>;
    delete(account: string): Promise<void>;
  };
}

const storageResults = z.array(StorageResult);

const storageApi = (calls: WorkerCalls): Argo['storage'] => ({
  batch: (queries) => calls.call({ api: 'storage', queries }, storageResults),
  execute: async (query) => {
    const [result] = await calls.call(
      { api: 'storage', queries: [query] },
      storageResults,
    );

    if (!result) throw new Error('Storage returned no result');

    return result;
  },
});

type SecretCall = Extract<PluginRequest, { api: 'secrets' }>;

const secretCall = (
  calls: WorkerCalls,
  request: Omit<SecretCall, 'api' | 'value'> & { value?: string },
): Promise<string | null | undefined> =>
  calls.call({ api: 'secrets', value: '', ...request }, z.string().nullish());

const secretsApi = (calls: WorkerCalls): Argo['secrets'] => ({
  get: async (account) =>
    (await secretCall(calls, { action: 'get', account })) ?? null,
  set: async (account, value) => {
    await secretCall(calls, { action: 'set', account, value });
  },
  delete: async (account) => {
    await secretCall(calls, { action: 'delete', account });
  },
});

// The frozen `argo` object is a Plugin's only way out of its worker.
export const createArgo = (calls: WorkerCalls): Readonly<Argo> =>
  Object.freeze({
    storage: Object.freeze(storageApi(calls)),
    secrets: Object.freeze(secretsApi(calls)),
  });
