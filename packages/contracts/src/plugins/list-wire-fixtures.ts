import type { WireNode } from './wire';

// A childless wire node, for the fixtures' trees.
export const node = (
  type: string,
  key: string,
  props: WireNode['props'] = {},
): WireNode => ({ type, key, props, children: [], slots: {} });

export const runListRoot: WireNode = {
  ...node('List', 'runs', { appearance: 'cards' }),
  children: [
    {
      ...node('List.Section', 'builds', {
        title: 'CI runs',
        footer: 'Latest builds',
      }),
      children: [
        {
          ...node('ListItem', 'web', {
            title: 'Deploy web',
            subtitle: 'main',
            selected: true,
            progress: { value: 0.4, tone: 'success', active: false },
            onPress: { $event: 'onPress' },
          }),
          slots: {
            meta: [
              node('Label', 'jobs', {
                icon: { sf: 'checkmark.circle', material: 'check_circle' },
                text: '2/5 jobs',
              }),
              node('Pill', 'environment', { text: 'Production' }),
            ],
            trailing: [node('Text', 'time', { children: 'now' })],
          },
        },
      ],
    },
  ],
};

const card = (id: string, title: string): WireNode =>
  node('ListItem', id, { id, title, onPress: { $event: 'onPress' } });

const lane = (id: string, title: string, cards: WireNode[]): WireNode => ({
  ...node('List.Section', id, { id, title }),
  children: cards,
});

// A board: each Section is a lane, side by side on a wide window; its rows move by drag and by their Move Actions.
export const boardListRoot: WireNode = {
  ...node('List', 'board', {
    accessibilityLabel: 'Board',
    layout: 'lanes',
    appearance: 'cards',
    onMove: { $event: 'onMove' },
  }),
  children: [
    lane('todo', 'To do', [
      card('login', 'Fix login'),
      card('docs', 'Write docs'),
    ]),
    lane('doing', 'Doing', [card('search', 'Add search')]),
    lane('done', 'Done', []),
  ],
};

// One lane of three cards, so the two lower cards each declare Move up.
export const queueListRoot: WireNode = {
  ...node('List', 'queue', {
    accessibilityLabel: 'Queue',
    onMove: { $event: 'onMove' },
  }),
  children: [
    lane('queue', 'Queue', [
      card('first', 'First card'),
      card('second', 'Second card'),
      card('third', 'Third card'),
    ]),
  ],
};

export const emptyRunListRoot: WireNode = {
  ...node('List', 'empty-runs'),
  slots: {
    empty: [
      {
        ...node('EmptyState', 'empty-state', {
          icon: 'issue',
          title: 'No runs yet',
          description: 'New CI runs appear here.',
        }),
        slots: {
          action: [
            node('Button', 'run-workflow', {
              label: 'Run workflow',
              onPress: { $event: 'onPress' },
            }),
          ],
        },
      },
    ],
  },
};
