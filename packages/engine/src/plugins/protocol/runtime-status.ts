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

// An answer that failed, and why; every kind of call that can fail in the engine answers one.
export type Failure = { ok: false; error: string };

export const failed = (error: string): Failure => ({ ok: false, error });

export const runtimeError = (cause: unknown): string =>
  cause instanceof Error ? cause.message : String(cause);
