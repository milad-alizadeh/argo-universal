import type { ViewMessage, WireNode } from './wire';

// The event name carried by the Tap me button.
export const helloTapEvent = 'onPress';

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

const helloButtons = (): WireNode =>
  withChildren(node('Row', '2', { gap: 2 }), [
    node('Button', '0', {
      label: 'Tap me',
      onPress: { $event: helloTapEvent },
    }),
    node('Button', '1', {
      label: 'Say hi',
      variant: 'outline',
      onPress: { action: 'toast', message: 'Hello from the Plugin' },
    }),
  ]);

const helloTree = (taps: number): WireNode =>
  withChildren(node('Column', '0', { gap: 4 }), [
    node('Text', '0', { label: 'Hello from a Plugin', variant: 'heading' }),
    node('Text', '1', { label: `Tapped ${taps} times` }),
    helloButtons(),
  ]);

// What `plugins/examples/hello` draws: the Engine journey expects the reconciler to produce it, and the registry stories render it.
export const helloRoot: WireNode = helloTree(0);

// Equivalent layouts exercise the new Stack vocabulary and its legacy aliases.
export const stackRowRoot: WireNode = withChildren(
  node('Stack', '0', { direction: 'row', gap: 2 }),
  [
    node('Text', '0', { label: 'First' }),
    node('Text', '1', { label: 'Second' }),
  ],
);

export const rowAliasRoot: WireNode = withChildren(
  node('Row', '0', { gap: 2 }),
  [
    node('Text', '0', { label: 'First' }),
    node('Text', '1', { label: 'Second' }),
  ],
);

export const stackColumnRoot: WireNode = withChildren(
  node('Stack', '0', { direction: 'column', gap: 2 }),
  [
    node('Text', '0', { label: 'First' }),
    node('Text', '1', { label: 'Second' }),
  ],
);

export const columnAliasRoot: WireNode = withChildren(
  node('Column', '0', { gap: 2 }),
  [
    node('Text', '0', { label: 'First' }),
    node('Text', '1', { label: 'Second' }),
  ],
);

export const helloSnapshot: ViewMessage = {
  type: 'snapshot',
  revision: 1,
  root: helloRoot,
};

// What one tap on "Tap me" changes.
export const helloTapPatch: ViewMessage = {
  type: 'patch',
  revision: 2,
  ops: [
    {
      op: 'setProps',
      key: ['1'],
      props: { label: 'Tapped 1 times' },
    },
  ],
};

export const helloTappedRoot: WireNode = helloTree(1);

// A newer Plugin's component the App does not know: a leaf is dropped, a container shows "Update Argo to see this".
export const unknownNodesRoot: WireNode = withChildren(node('Column', '0'), [
  node('Text', '0', { label: 'Before' }),
  node('Sparkline', '1', { unit: 'ms' }),
  withChildren(node('Carousel', '2'), [node('Text', '0', { label: 'Inside' })]),
  node('Text', '3', { label: 'After' }),
]);

export const unknownNodesSnapshot: ViewMessage = {
  type: 'snapshot',
  revision: 1,
  root: unknownNodesRoot,
};

// Props the node's schema refuses leave that node out and keep its siblings.
export const invalidPropsRoot: WireNode = withChildren(node('Column', '0'), [
  node('Text', '0', { label: 42 }),
  node('Text', '1', { label: 'Still here' }),
]);

export const invalidPropsSnapshot: ViewMessage = {
  type: 'snapshot',
  revision: 1,
  root: invalidPropsRoot,
};

// The event name carried by the Wave button.
export const helloSlotWaveEvent = 'onPress';

export const helloSlotTree = (projectId: string, waves: number): WireNode =>
  withChildren(node('Column', '0', { gap: 2 }), [
    node('Text', '0', {
      label:
        waves === 0
          ? `Hello from ${projectId}`
          : `Waved at ${projectId} ${waves} times`,
    }),
    node('Button', '1', {
      label: 'Wave',
      variant: 'outline',
      onPress: { $event: helloSlotWaveEvent },
    }),
  ]);

// What hello draws in Project details for the Project `argo`.
export const helloSlotRoot: WireNode = helloSlotTree('argo', 0);

export const helloSlotSnapshot: ViewMessage = {
  type: 'snapshot',
  revision: 1,
  root: helloSlotRoot,
};

// What one tap on "Wave" changes.
export const helloSlotWavePatch: ViewMessage = {
  type: 'patch',
  revision: 2,
  ops: [
    { op: 'setProps', key: ['0'], props: { label: 'Waved at argo 1 times' } },
  ],
};

// Both multi-node Slots and element-array props retain their order and their events.
export const slottedRow: WireNode = {
  ...node('GroupedListItem', 'row', { label: 'Slotted row' }),
  slots: {
    leading: [
      node('Text', 'first', { label: 'First' }),
      node('Text', 'second', { label: 'Second' }),
    ],
    accessories: [
      node('Button', 'button', {
        label: 'Increment',
        onPress: { $event: 'onPress' },
      }),
      node('Text', 'count', { label: 'Count 0' }),
    ],
  },
};

export { runListRoot, emptyRunListRoot } from './list-wire-fixtures';
