import type { RegistryPort } from '../src/services/agents';

interface ControllableRegistry {
  port: RegistryPort;
  resolve(value: unknown): void;
  reject(error: Error): void;
}

export function createControllableRegistry(): ControllableRegistry {
  let pending = Promise.withResolvers<unknown>();
  return {
    port: {
      readRegistry: (): Promise<unknown> => {
        pending = Promise.withResolvers<unknown>();
        return pending.promise;
      },
    },
    resolve: (value): void => pending.resolve(value),
    reject: (error): void => pending.reject(error),
  };
}
