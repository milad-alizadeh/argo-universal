import { toolCallSlotId } from '@repo/contracts/plugins/replaceable';
import type { ViewMessage, WireNode } from '@repo/contracts/plugins/wire';
import { expect, it } from 'vitest';
import type { Opening } from './open-view';
import { PluginViews } from './plugin-views';

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

type Drawing = { logs: string[]; views: PluginViews; viewId: string };

function drawing(opening: Opening, messages: ViewMessage[]): Drawing {
  const logs: string[] = [];

  const views = new PluginViews(
    () => {},
    (line) => logs.push(line),
  );

  const { viewId } = views.headless(atlas, opening, 60_000);

  for (const message of messages) views.receive(atlas, viewId, message);

  return { logs, views, viewId };
}

it('writes a reason a Plugin spread over lines as one log line', () => {
  const { logs } = drawing({ path: '/sync' }, [
    drawn(node(renderError, { reason: 'Atlas threw\nPlugin argo: all well' })),
  ]);

  expect(logs).toEqual([
    'Plugin atlas: could not draw /sync: Atlas threw Plugin argo: all well',
  ]);
});

it('keeps a replaceable Slot that asks core to draw after it has drawn once', () => {
  const { logs, views, viewId } = drawing(
    { path: 'render:tool-call', renderSlot: toolCallSlotId },
    [
      drawn(node('Stack', { direction: 'column' })),
      redrawn(node(renderError, { reason: 'Atlas declines this call' })),
    ],
  );

  expect(logs).toEqual([]);
  expect(views.dataView(atlas, viewId).root).toMatchObject({
    type: renderError,
  });
});
