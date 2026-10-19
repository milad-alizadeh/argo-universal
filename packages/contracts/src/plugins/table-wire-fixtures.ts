import { node } from './list-wire-fixtures';
import type { WireNode } from './wire';

const cell = (key: string, column: string, text: string): WireNode =>
  node('Table.Cell', key, { column, text });

const statusCell = (key: string, text: string, tone: string): WireNode => ({
  ...cell(key, 'status', text),
  children: [node('Pill', `${key}-pill`, { text, tone })],
});

type Run = readonly [
  name: string,
  branch: string,
  status: string,
  tone: string,
  time: string,
];

const rerun = (id: string): WireNode => ({
  ...node('ActionList', `${id}-actions`),
  children: [
    node('Action', `${id}-rerun`, {
      label: 'Re-run',
      icon: 'retry',
      onPress: { $event: 'onPress' },
    }),
  ],
});

const run = (
  id: string,
  [name, branch, status, tone, time]: Run,
): WireNode => ({
  ...node('Table.Row', id, { id, onPress: { $event: 'onPress' } }),
  children: [
    cell(`${id}-name`, 'name', name),
    cell(`${id}-branch`, 'branch', branch),
    statusCell(`${id}-status`, status, tone),
    cell(`${id}-time`, 'time', time),
  ],
  slots: { actions: [rerun(id)] },
});

export const runTableRoot: WireNode = {
  ...node('Table', 'runs', {
    accessibilityLabel: 'CI runs',
    columns: [
      { id: 'name', title: 'Workflow' },
      { id: 'branch', title: 'Branch', width: 'md' },
      { id: 'status', title: 'Status', width: 'sm' },
      {
        id: 'time',
        title: 'Started',
        width: 'sm',
        align: 'end',
        sortable: true,
      },
    ],
    sort: { column: 'time', direction: 'descending' },
    onSortChange: { $event: 'onSortChange' },
    selectionMode: 'multiple',
    selection: [],
    onSelectionChange: { $event: 'onSelectionChange' },
  }),
  children: [
    run('web', ['Deploy web', 'main', 'Passed', 'success', '2 min ago']),
    run('api', ['Test API', 'fix/auth', 'Failed', 'danger', '9 min ago']),
  ],
};
