import { currentPluginSurface } from '@repo/contracts/plugins/kit';
import type { DrawAnswer } from '@repo/contracts/plugins/page-draw';
import type { PluginFailure } from '@repo/contracts/plugins/runtime';
import type { SecretParams } from '@repo/contracts/plugins/secret-bindings';
import type { WireJson } from '@repo/contracts/plugins/wire';
import type { PluginClock } from '../clock';
import type { PluginEvent } from '../protocol/runtime';
import { PluginFailures } from '../runtime/failures';
import { WorkerCalls } from '../runtime/worker-calls';
import { noSecretParams } from './checked-tree';
import type { Answered } from './draw-calls';
import { PageChanges } from './page-changes';
import { PluginDraws } from './plugin-draws';

export type Draws = {
  pages: PluginDraws;
  workers: WorkerCalls;
  sent: PluginEvent[];
  failures: PluginFailures;
};

const idleClock: PluginClock = {
  now: () => 0,
  delay: () => Promise.resolve(),
  schedule: () => () => null,
};

// A write makes nothing due in these draws.
const written = (): null => null;

// A Plugin named Atlas whatever its id, so its drawing failures can be listed.
const named = (): PluginFailures =>
  new PluginFailures((pluginId) => ({ pluginId, name: 'Atlas' }));

export function draws(log: (line: string) => void = (): null => null): Draws {
  const sent: PluginEvent[] = [];
  const send = (_: string, event: PluginEvent): number => sent.push(event);
  const workers = new WorkerCalls({ send, clock: idleClock });
  const failures = named();
  const changes = new PageChanges(workers, written);

  const pages = new PluginDraws({
    workers,
    log,
    changes,
    drawings: failures,
    secretParams: (): SecretParams => noSecretParams,
  });

  return { pages, workers, sent, failures };
}

// The App draws today's Plugin trees.
export const surface = currentPluginSurface('web');

export async function listed(
  failures: PluginFailures,
): Promise<PluginFailure[]> {
  const watching = new AbortController();
  const { value } = await failures.watch(watching.signal).next();

  watching.abort();

  return value ?? [];
}

// The id of the draw the worker was last sent, or none.
export const lastDraw = (sent: PluginEvent[]): number => {
  const event = sent.at(-1);

  return event?.type === 'draw' ? event.id : -1;
};

type WorkerAnswer = { root: WireJson } | { error: string };

const answered = (id: number, answer: WorkerAnswer): Answered =>
  'root' in answer
    ? { action: 'drawn', id, root: answer.root, pages: 1 }
    : { action: 'failed', id, error: answer.error };

// One draw of `path`, answered by the running worker with what it sends.
export async function drawn(
  { pages, sent }: Draws,
  path: string,
  answer: WorkerAnswer,
): Promise<DrawAnswer> {
  const at = { path, pageState: {}, pages: 1, surface };
  const drawing = pages.answer({ pluginId: 'atlas', at });

  pages.receive(
    { pluginId: 'atlas', generation: 1 },
    answered(lastDraw(sent), answer),
  );

  return drawing;
}
