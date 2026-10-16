import type { ViewMessage, WireNode } from './wire';

// The event id of "Tap me": its position in the tree, then the prop.
export const helloTapEventId = '0/2/0:onPress';

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
      onPress: { $event: helloTapEventId },
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
export const helloSnapshot: ViewMessage = {
  type: 'snapshot',
  revision: 1,
  root: helloTree(0),
};

// What one tap on "Tap me" changes.
export const helloTapPatch: ViewMessage = {
  type: 'patch',
  revision: 2,
  ops: [
    {
      op: 'props',
      path: [1],
      props: { label: 'Tapped 1 times' },
    },
  ],
};

export const helloTappedRoot: WireNode = helloTree(1);

// A newer Plugin's component the App does not know: a leaf is dropped, a container shows "Update Argo to see this".
export const unknownNodesSnapshot: ViewMessage = {
  type: 'snapshot',
  revision: 1,
  root: withChildren(node('Column', '0'), [
    node('Text', '0', { label: 'Before' }),
    node('Sparkline', '1', { unit: 'ms' }),
    withChildren(node('Carousel', '2'), [
      node('Text', '0', { label: 'Inside' }),
    ]),
    node('Text', '3', { label: 'After' }),
  ]),
};

// Props the node's schema refuses leave that node out and keep its siblings.
export const invalidPropsSnapshot: ViewMessage = {
  type: 'snapshot',
  revision: 1,
  root: withChildren(node('Column', '0'), [
    node('Text', '0', { label: 42 }),
    node('Text', '1', { label: 'Still here' }),
  ]),
};
