import { toolCallSlotId } from '@repo/contracts/plugins/replaceable';
import type { ViewMessage, WireNode } from '@repo/contracts/plugins/wire';
import { expect, it } from 'vitest';
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

function drawing(opening: Opening, messages: ViewMessage[]): Drawing {
  const logs: string[] = [];
  const failed: string[] = [];

  const views = new PluginViews(
    () => {},
    (line) => logs.push(line),
    {
      ...noViewLifecycle,
      failed: (_view, reason): void => {
        failed.push(reason);
      },
    },
  );

  const { viewId } = views.headless(atlas, opening, 60_000);

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

it('falls a replaceable Slot back to core, failing nothing, when it asks core to draw after it has drawn once', () => {
  const { logs, failed } = drawing(
    { path: 'render:tool-call', renderSlot: toolCallSlotId },
    [
      drawn(node('Stack', { direction: 'column' })),
      redrawn(node(renderError, { reason: 'Atlas declines this call' })),
    ],
  );

  expect(logs).toEqual([
    `Plugin atlas: core fallback ${toolCallSlotId}: Atlas declines this call`,
  ]);
  expect(failed).toEqual([]);
});

it('falls a replaceable Slot back to core when its tree holds SVG the sanitiser refuses', () => {
  const unsafe = {
    ...node('Svg', { xml: '<svg><script/></svg>', label: 'x' }),
    key: 'x',
  };

  const { logs, failed } = drawing(
    { path: 'render:tool-call', renderSlot: toolCallSlotId },
    [drawn({ ...node('Stack', { direction: 'column' }), children: [unsafe] })],
  );

  expect(logs).toEqual([
    `Plugin atlas: core fallback ${toolCallSlotId}: Stack#root/Svg#x: element <script> refused`,
  ]);
  expect(failed).toEqual([]);
});
