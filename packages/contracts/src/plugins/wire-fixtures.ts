import type { ViewMessage, WireNode } from './wire';

// The event name carried by the Tap me button.
export const counterTapEvent = 'onPress';

// A leaf node; `withChildren` makes it a container.
const node = (
  type: string,
  key: string,
  props: WireNode['props'] = {},
): WireNode => ({ type, key, props, children: [], slots: {} });

const withChildren = (parent: WireNode, children: WireNode[]): WireNode => ({
  ...parent,
  children,
});

const column = node('Stack', '0', { direction: 'column' });

const counterButtons = (key: string): WireNode =>
  withChildren(node('Stack', key, { direction: 'row', gap: 2 }), [
    node('Button', '0', {
      label: 'Tap me',
      onPress: { $event: counterTapEvent },
    }),
    node('Button', '1', {
      label: 'Say hi',
      variant: 'secondary',
      onPress: { action: 'toast', message: 'Hello from the Plugin' },
    }),
  ]);

const counterTree = (taps: number): WireNode =>
  withChildren(node('Stack', '0', { direction: 'column', gap: 4 }), [
    node('Text', '0', { children: 'Counter fixture', role: 'heading' }),
    node('Text', '1', { children: `Tapped ${taps} times` }),
    node('Pill', '2', { text: 'Healthy', tone: 'success' }),
    node('ListItem', '3', {
      title: 'Waiting jobs',
      badge: { kind: 'count', count: 3, label: '3 queued jobs' },
    }),
    counterButtons('4'),
  ]);

// The wire-counter fixture Plugin draws this; registry stories render the same wire contract.
export const counterRoot: WireNode = counterTree(0);

export const counterSnapshot: ViewMessage = {
  type: 'snapshot',
  revision: 1,
  root: counterRoot,
};

// What one tap on "Tap me" changes.
export const counterTapPatch: ViewMessage = {
  type: 'patch',
  revision: 2,
  ops: [
    {
      op: 'setProps',
      key: ['1'],
      props: { children: 'Tapped 1 times' },
    },
  ],
};

export const counterTappedRoot: WireNode = counterTree(1);

// A newer Plugin's component the App does not know: a leaf is dropped, a container shows "Update Argo to see this".
export const unknownNodesRoot: WireNode = withChildren(column, [
  node('Text', '0', { children: 'Before' }),
  node('Sparkline', '1', { unit: 'ms' }),
  withChildren(node('Carousel', '2'), [
    node('Text', '0', { children: 'Inside' }),
  ]),
  node('Text', '3', { children: 'After' }),
]);

export const unknownNodesSnapshot: ViewMessage = {
  type: 'snapshot',
  revision: 1,
  root: unknownNodesRoot,
};

// Props the node's schema refuses leave that node out and keep its siblings.
export const invalidPropsRoot: WireNode = withChildren(column, [
  node('Text', '0', { children: true }),
  node('Text', '1', { children: 'Still here' }),
]);

export const invalidPropsSnapshot: ViewMessage = {
  type: 'snapshot',
  revision: 1,
  root: invalidPropsRoot,
};

// The event name carried by the Wave button.
export const waveCounterWaveEvent = 'onPress';

export const waveCounterTree = (projectId: string, waves: number): WireNode =>
  withChildren(node('Stack', '0', { direction: 'column', gap: 2 }), [
    node('Text', '0', {
      children:
        waves === 0
          ? `Hello from ${projectId}`
          : `Waved at ${projectId} ${waves} times`,
    }),
    node('Button', '1', {
      label: 'Wave',
      variant: 'secondary',
      onPress: { $event: waveCounterWaveEvent },
    }),
  ]);

// The wave-counter fixture Plugin's page for the Project `argo`.
export const waveCounterRoot: WireNode = waveCounterTree('argo', 0);

export const waveCounterSnapshot: ViewMessage = {
  type: 'snapshot',
  revision: 1,
  root: waveCounterRoot,
};

// What one tap on "Wave" changes.
export const waveCounterWavePatch: ViewMessage = {
  type: 'patch',
  revision: 2,
  ops: [
    {
      op: 'setProps',
      key: ['0'],
      props: { children: 'Waved at argo 1 times' },
    },
  ],
};

// Both multi-node Slots and element-array props retain their order and their events.
export const slottedRow: WireNode = {
  ...node('ListItem', 'row', { title: 'Slotted row' }),
  // Text goes in trailing: the leading lane is a fixed icon-width box (ADR-0032).
  slots: {
    trailing: [
      node('Text', 'first', { children: 'First' }),
      node('Text', 'second', { children: 'Second' }),
      node('Button', 'button', {
        label: 'Increment',
        onPress: { $event: 'onPress' },
      }),
      node('Text', 'count', { children: 'Count 0' }),
    ],
  },
};

export {
  boardListRoot,
  queueListRoot,
  runListRoot,
  emptyRunListRoot,
} from './list-wire-fixtures';

export { runTableRoot } from './table-wire-fixtures';
