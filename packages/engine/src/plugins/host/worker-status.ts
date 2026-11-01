import { running, type HostMessage } from '../protocol/runtime.ts';

type Status = Extract<HostMessage, { type: 'status' }>;

export const runningStatus = (
  pluginId: string,
  generation: number,
): Status => ({
  type: 'status',
  pluginId,
  generation,
  ...running,
});

export const crashedStatus = (
  pluginId: string,
  generation: number,
  { error, hanging }: { error: string; hanging: boolean },
): Status => ({
  type: 'status',
  pluginId,
  generation,
  state: 'crashed',
  hanging,
  error,
});
