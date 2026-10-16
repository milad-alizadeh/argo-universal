import type { ViewMessage, WireNode } from './wire';

const node = (
  type: string,
  key: string,
  props: WireNode['props'],
  children: WireNode[] = [],
  slots: WireNode['slots'] = {},
): WireNode => ({ type, key, props, children, slots });

const helloTree = (taps: number): WireNode =>
  node('Column', '0', { gap: 4 }, [
    node('Text', '0', { label: 'Hello from a Plugin', role: 'heading' }),
    node('Text', '1', { label: `Tapped ${taps} times` }),
    node('Row', '2', { gap: 2 }, [
      node('Button', '0', { label: 'Tap me', onPress: { $event: '0/2/0:onPress' } }),
      node('Button', '1', {
        label: 'Say hi',
        variant: 'outline',
        onPress: { action: 'toast', message: 'Hello from the Plugin' },
      }),
    ]),
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
  root: node('Column', '0', {}, [
    node('Text', '0', { label: 'Before' }),
    node('Sparkline', '1', { values: [1, 2, 3] }),
    node('Carousel', '2', {}, [node('Text', '0', { label: 'Inside' })]),
    node('Text', '3', { label: 'After' }),
  ]),
};

// Props the node's schema refuses leave that node out and keep its siblings.
export const invalidPropsSnapshot: ViewMessage = {
  type: 'snapshot',
  revision: 1,
  root: node('Column', '0', {}, [
    node('Text', '0', { label: 42 }),
    node('Text', '1', { label: 'Still here' }),
  ]),
};
