import type {
  LoaderPageCall,
  PageAddress,
} from '@repo/contracts/plugins/page-address';
import type { PluginEvent } from '../protocol/runtime';
import type { Failure } from '../protocol/runtime-status';
import type { CallKind, CallOutcome, Ended } from '../runtime/worker-calls';

// One draw call to a worker: what it asks, what the worker answers, and the Loader reads it holds; a live draw's frames are routed apart.
export type Answered = Exclude<
  Extract<LoaderPageCall, { id: number }>,
  { action: 'frame' }
>;

// `stopped` when the Plugin stopped or was not running: why the Plugin stopped, if it crashed, is its own failure.
type Failed = Failure & { stopped?: true };

// The worker's answer, or why none came: it stopped, was not running or ran out of time.
export type Outcome = Answered | Failed;

// An address, how many pages of its paged list the App shows, and the Connection that asked.
export type DrawAt = Omit<
  Extract<PluginEvent, { type: 'draw' }>,
  'type' | 'id'
>;

export type Loaded = { ok: true } | Failure;

export const failed = (error: string): Failed => ({ ok: false, error });

// Where a background pass runs a Loader alone: its Page path and the Project it reads for.
export type LoadAt = { path: string; projectId: string };

// A background pass's draw: the Loader alone, for its Project's first page, as no Connection asks.
export const passAt = ({ path, projectId }: LoadAt): DrawAt => ({
  path,
  projectId,
  pageState: {},
  pages: 1,
  serverDevice: false,
  loadOnly: true,
});

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

function outcomeOf(outcome: CallOutcome<Answered>, at: DrawAt): Outcome {
  if ('answered' in outcome) return outcome.answered;

  const error = endedError[outcome.ended](outcome.pluginId, at.path);

  return outcome.ended === 'late'
    ? failed(error)
    : { ...failed(error), stopped: true };
}

/*
 * The draw a Loader's call is for: its Project, whether the Connection that asked is the Server Device, the
 * address holding its reads, or none for a background pass, and the interval its page is drawn again on,
 * as clamped.
 */
export type DrawLookup = {
  draw: number;
  projectId?: string;
  serverDevice: boolean;
  holder?: PageAddress;
  every?: number;
};

/*
 * A draw that only loads is a background pass's, which holds nothing and reads fresh; any other draw is
 * held by its address and reads past the interval its page is drawn again on.
 */
export function drawLookupOf(
  pluginId: string,
  draw: number,
  { at, every }: { at: DrawAt | undefined; every?: number },
): DrawLookup | undefined {
  if (!at) return undefined;

  const { projectId } = at;
  const serverDevice = at.serverDevice === true;

  if (at.loadOnly) return { draw, projectId, serverDevice };

  const holder = addressOf(pluginId, at);

  return { draw, projectId, serverDevice, holder, every };
}

export const addressOf = (
  pluginId: string,
  { path, pageState, projectId, sessionId }: DrawAt,
): PageAddress => ({
  pluginId,
  path,
  pageState,
  ...(projectId !== undefined && { projectId }),
  ...(sessionId !== undefined && { sessionId }),
});

/*
 * How long a Loader may read before its draw fails. A Loader awaits the Plugin's own reads, such as a
 * `gh` call, so it is given as long as an Operation.
 */
const drawLimitMs = 30_000;

export const drawKind: CallKind<DrawAt, Answered, Outcome> = {
  event: (id, at) => ({ type: 'draw', id, ...at }),
  limitMs: drawLimitMs,
  result: outcomeOf,
};
