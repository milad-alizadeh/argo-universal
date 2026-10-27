import type { PluginFailure } from '@repo/contracts/plugins/runtime';
import type {
  PluginEvent,
  PluginViewId,
  WireNode,
} from '@repo/contracts/plugins/wire';
import { expect, it } from 'vitest';
import type { Opening } from '../views/open-view';
import { PluginViews } from '../views/plugin-views';
import { PluginFailures } from './failures';

const root = (type: string, props: Record<string, string>): WireNode => ({
  type,
  key: 'root',
  props,
  children: [],
  slots: {},
});

const atlas = 'atlas';

const threw = 'Atlas threw';

const drew = root('Stack', { direction: 'column' });

const broke = root('#render-error', { reason: threw });

type Wiring = {
  failures: PluginFailures;
  views: PluginViews;
  opened: () => PluginViewId;
};

function wiring(): Wiring {
  const failures = new PluginFailures((pluginId) => ({
    pluginId,
    name: 'Atlas',
  }));

  const sent: PluginEvent[] = [];

  const views = new PluginViews(
    (_pluginId, event) => sent.push(event),
    () => {},
    {
      opened: (): void => {},
      received: (view): void => failures.drew(view),
      failed: (view, message): void => failures.failed(view, message),
      released: (view, last): void => failures.released(view, last),
    },
  );

  return { failures, views, opened: (): PluginViewId => openedViewId(sent) };
}

function openedViewId(sent: PluginEvent[]): PluginViewId {
  const open = sent.findLast((event) => event.type === 'open');

  if (open?.type !== 'open') throw new Error('no view was opened');

  return open.viewId;
}

// The App's end of a view: the stream it reads for as long as it is asking for that Opening.
function ask(views: PluginViews, opening: Opening): () => Promise<void> {
  const connection = new AbortController();

  const stream = views.watch(atlas, opening, {
    id: 'app',
    signal: connection.signal,
  });

  const reading = stream.next();

  return async () => {
    connection.abort();
    await reading;
  };
}

const settled = (): Promise<void> =>
  new Promise((resolve) => setImmediate(resolve));

async function listed(failures: PluginFailures): Promise<PluginFailure[]> {
  const watching = new AbortController();

  const { value } = await failures.watch(watching.signal).next();
  watching.abort();

  return value ?? [];
}

const snapshot = { type: 'snapshot', revision: 1 } as const;

it('leaves a failed Opening failed when another Opening of the Plugin draws', async () => {
  const { failures, views, opened } = wiring();
  ask(views, { path: '/map' });
  await settled();
  views.receive(atlas, opened(), { ...snapshot, root: broke });
  ask(views, { path: '/files' });
  await settled();
  views.receive(atlas, opened(), { ...snapshot, root: drew });

  expect(await listed(failures)).toMatchObject([
    { kind: 'drawing', message: threw, pluginId: atlas },
  ]);
});

it('keeps an Opening failed across a Plugin reload and clears it when it draws again', async () => {
  const { failures, views, opened } = wiring();
  ask(views, { path: '/map' });
  await settled();
  views.receive(atlas, opened(), { ...snapshot, root: broke });
  ask(views, { path: '/map' });
  await settled();

  // A reload retires every view of the Plugin, minting a viewId for the Opening the App still asks for.
  views.reopen(atlas);
  expect(await listed(failures)).toMatchObject([{ message: threw }]);

  views.receive(atlas, opened(), { ...snapshot, root: drew });
  expect(await listed(failures)).toEqual([]);
});

it('drops an Opening failure once the App stops asking for that Opening', async () => {
  const { failures, views, opened } = wiring();
  ask(views, { path: '/map' });
  await settled();
  views.receive(atlas, opened(), { ...snapshot, root: broke });
  const asking = ask(views, { path: '/map' });
  await settled();
  expect(await listed(failures)).toMatchObject([{ message: threw }]);

  await asking();
  expect(await listed(failures)).toEqual([]);
});

it('rolls two failed Openings of one Plugin up to one failure for the App', async () => {
  const { failures, views, opened } = wiring();
  ask(views, { path: '/map' });
  await settled();
  views.receive(atlas, opened(), { ...snapshot, root: broke });
  ask(views, { path: '/files' });
  await settled();
  views.receive(atlas, opened(), {
    ...snapshot,
    root: root('#render-error', { reason: 'Atlas threw twice' }),
  });

  expect(await listed(failures)).toMatchObject([
    { message: 'Atlas threw twice' },
  ]);
});

it('fails an Opening whose page threw after it had already drawn', async () => {
  const { failures, views, opened } = wiring();
  ask(views, { path: '/map' });
  await settled();
  const viewId = opened();
  views.receive(atlas, viewId, { ...snapshot, root: drew });
  views.receive(atlas, viewId, {
    type: 'patch',
    revision: 2,
    ops: [{ op: 'replace', key: [], node: broke }],
  });

  expect(await listed(failures)).toMatchObject([
    { kind: 'drawing', message: threw, pluginId: atlas },
  ]);
});

it('retires a failed Opening with no view left when the Plugin is deactivated', async () => {
  const { failures, views } = wiring();
  const page = views.headless(atlas, { path: '/sync' }, 60_000);
  views.receive(atlas, page.viewId, { ...snapshot, root: broke });
  expect(await listed(failures)).toMatchObject([{ message: threw }]);

  failures.ended(atlas);
  expect(await listed(failures)).toEqual([]);
});
