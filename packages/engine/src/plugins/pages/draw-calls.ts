import type {
  LoaderPageCall,
  PageAddress,
} from '@repo/contracts/plugins/page-address';
import type { PluginEvent } from '../protocol/runtime';
import type { CallOutcome, Ended } from '../runtime/worker-calls';

// One draw call to a worker: what it asks, what the worker answers, and the Loader reads it holds.
export type Answered = Extract<LoaderPageCall, { id: number }>;

type Failed = { ok: false; error: string };

// The worker's answer, or why none came: it stopped, was not running or ran out of time.
export type Outcome = Answered | Failed;

// An address, how many pages of its paged list the App shows, and the Connection that asked.
export type DrawAt = Omit<
  Extract<PluginEvent, { type: 'draw' }>,
  'type' | 'id'
>;

export type Loaded = { ok: true } | { ok: false; error: string };

export const failed = (error: string): Failed => ({ ok: false, error });

export const answeredError = (answered: Answered): string =>
  answered.action === 'failed' ? answered.error : 'The page only loaded';

export function loadedOf(outcome: Outcome): Loaded {
  if ('ok' in outcome) return outcome;

  return outcome.action === 'failed' ? failed(outcome.error) : { ok: true };
}

const endedError: Record<Ended, (pluginId: string, path: string) => string> = {
  notRunning: (pluginId: string): string => `Plugin ${pluginId} is not running`,
  stopped: (): string => 'Plugin stopped',
  late: (_pluginId: string, path: string): string =>
    `${path} did not draw in time`,
};

export function outcomeOf(outcome: CallOutcome<Answered>, at: DrawAt): Outcome {
  if ('answered' in outcome) return outcome.answered;

  return failed(endedError[outcome.ended](outcome.pluginId, at.path));
}

/*
 * The draw a Loader's call is for: its Project, whether the Connection that asked is the Server Device, and
 * the address holding its reads, or none for a background pass.
 */
export type Drawing = {
  draw: number;
  projectId?: string;
  serverDevice: boolean;
  holder?: PageAddress;
};

// A draw that only loads is a background pass's, which holds nothing; any other draw is held by its address.
export function drawingOf(
  pluginId: string,
  draw: number,
  at: DrawAt | undefined,
): Drawing | undefined {
  if (!at) return undefined;

  const { projectId } = at;
  const serverDevice = at.serverDevice === true;

  if (at.loadOnly) return { draw, projectId, serverDevice };

  return { draw, projectId, serverDevice, holder: addressOf(pluginId, at) };
}

const addressOf = (
  pluginId: string,
  { path, pageState, projectId, sessionId }: DrawAt,
): PageAddress => ({
  pluginId,
  path,
  pageState,
  ...(projectId !== undefined && { projectId }),
  ...(sessionId !== undefined && { sessionId }),
});
