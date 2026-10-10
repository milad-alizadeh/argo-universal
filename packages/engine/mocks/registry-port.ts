import type { FetchAgents } from '../src/services/agents';

interface ControllableRegistry {
  fetchAgents: FetchAgents;
  resolve(value: unknown): void;
  reject(error: Error): void;
}

export function createControllableRegistry(): ControllableRegistry {
  let pending = Promise.withResolvers<unknown>();
  return {
    fetchAgents: (): Promise<unknown> => {
      pending = Promise.withResolvers<unknown>();
      return pending.promise;
    },
    resolve: (value): void => pending.resolve(value),
    reject: (error): void => pending.reject(error),
  };
}
