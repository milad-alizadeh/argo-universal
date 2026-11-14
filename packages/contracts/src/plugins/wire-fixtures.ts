import type { WireNode } from './wire';

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

const counterButtons = (key: string, taps: number): WireNode =>
  withChildren(node('Stack', key, { direction: 'row', gap: 2 }), [
    node('Button', '0', {
      label: 'Tap me',
      onPress: { pageState: { taps: taps + 1 } },
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
    counterButtons('4', taps),
  ]);

// The wire-counter fixture Plugin draws this; registry stories render the same wire contract.
export const counterRoot: WireNode = counterTree(0);

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

// Props the node's schema refuses leave that node out and keep its siblings.
export const invalidPropsRoot: WireNode = withChildren(column, [
  node('Text', '0', { children: true }),
  node('Text', '1', { children: 'Still here' }),
]);

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
      onPress: { pageState: { waves: waves + 1 } },
    }),
  ]);

// The wave-counter fixture Plugin's page for the Project `argo`.
export const waveCounterRoot: WireNode = waveCounterTree('argo', 0);

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
        onPress: { pageState: { count: 1 } },
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

export { issueBoardRoot, emptyBoardRoot } from './board-wire-fixtures';
