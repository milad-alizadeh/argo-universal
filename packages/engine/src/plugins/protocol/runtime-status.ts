import type { PluginStatus } from '@repo/contracts/plugins/runtime';

export const notStarted: PluginStatus = {
  state: 'not-started',
  hanging: false,
  error: null,
};

export const crashed = (error: string): PluginStatus => ({
  state: 'crashed',
  hanging: false,
  error,
});

export const running: PluginStatus = {
  state: 'running',
  hanging: false,
  error: null,
};

export const runtimeError = (cause: unknown): string =>
  cause instanceof Error ? cause.message : String(cause);
