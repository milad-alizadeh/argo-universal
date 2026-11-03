import { currentPluginSurface } from '@repo/contracts/plugins/kit';
import type {
  PluginEvent,
  PluginViewId,
  ViewMessage,
  WireNode,
} from '@repo/contracts/plugins/wire';
import { pluginPageBytes } from '@repo/contracts/plugins/wire-limits';
import { expect, it, onTestFinished } from 'vitest';
import type { Opening } from './open-view';
import { PluginViews } from './plugin-views';
import { noViewLifecycle } from './view-registry';

const atlas = 'atlas';

const renderError = '#render-error';

const node = (type: string, props: Record<string, string>): WireNode => ({
  type,
  key: 'root',
  props,
  children: [],
  slots: {},
});

const drawn = (root: WireNode): ViewMessage => ({
  type: 'snapshot',
  revision: 1,
  root,
});

const redrawn = (root: WireNode): ViewMessage => ({
  type: 'patch',
  revision: 2,
  ops: [{ op: 'replace', key: [], node: root }],
});

type Drawing = { logs: string[]; failed: string[] };

function openedView(sent: PluginEvent[]): PluginViewId {
  const open = sent.find((event) => event.type === 'open');

  if (open?.type !== 'open') throw new Error('no view was opened');

  return open.viewId;
}

// An App watches the page, and the worker sends it `messages`.
function drawing(opening: Opening, messages: ViewMessage[]): Drawing {
  const logs: string[] = [];
  const failed: string[] = [];
  const sent: PluginEvent[] = [];

  const views = new PluginViews(
    (_pluginId, event) => sent.push(event),
    (line) => logs.push(line),
    {
      ...noViewLifecycle,
      failed: (_view, reason): void => {
        failed.push(reason);
      },
    },
  );

  const app = new AbortController();
  onTestFinished(() => app.abort());
  void views
    .watch(atlas, opening, {
      id: 'app',
      signal: app.signal,
      surface: currentPluginSurface('web'),
    })
    .next();
  const viewId = openedView(sent);

  for (const message of messages) views.receive(atlas, viewId, message);

  return { logs, failed };
}

it('writes a reason a Plugin spread over lines as one log line', () => {
  const { logs, failed } = drawing({ path: '/sync' }, [
    drawn(node(renderError, { reason: 'Atlas threw\nPlugin argo: all well' })),
  ]);

  expect(logs).toEqual([
    'Plugin atlas: could not draw /sync: Atlas threw Plugin argo: all well',
  ]);
  expect(failed).toEqual(['Atlas threw\nPlugin argo: all well']);
});

it('fails a page that throws after its snapshot was refused for size', () => {
  const oversized = node('Text', { children: 'x'.repeat(pluginPageBytes) });

  const { logs, failed } = drawing({ path: '/sync' }, [
    drawn(oversized),
    redrawn(node(renderError, { reason: 'Atlas threw' })),
  ]);

  expect(failed).toEqual(['Atlas threw']);
  expect(logs).toContain('Plugin atlas: could not draw /sync: Atlas threw');
});
