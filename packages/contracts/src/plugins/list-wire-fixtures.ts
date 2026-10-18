import type { WireNode } from './wire';

const node = (
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
            trailing: [node('Text', 'time', { label: 'now' })],
          },
        },
      ],
    },
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
