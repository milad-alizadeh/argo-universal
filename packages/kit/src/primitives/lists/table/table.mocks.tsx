import type { ReactElement } from 'react';
import { Action } from '#primitives/actions/action';
import { Pill } from '#primitives/status/pill';
import { Table } from './table';
import type { TableColumn, TableSort } from './table-props';

export const runColumns = [
  { id: 'workflow', title: 'Workflow' },
  { id: 'branch', title: 'Branch', width: 'lg' },
  { id: 'status', title: 'Status', width: 'md' },
  {
    id: 'duration',
    title: 'Duration',
    width: 'sm',
    align: 'end',
    sortable: true,
  },
  {
    id: 'started',
    title: 'Started',
    width: 'md',
    align: 'end',
    sortable: true,
  },
] as const satisfies readonly TableColumn[];

type Tone = 'success' | 'info' | 'danger';

// id, workflow, branch, status, tone, duration, seconds, started, minutes ago.
type Run = readonly [
  string,
  string,
  string,
  string,
  Tone,
  string,
  number,
  string,
  number,
];

const runs: readonly Run[] = [
  [
    'typecheck',
    'Typecheck',
    'main',
    'Passed',
    'success',
    '1m 42s',
    102,
    '2 min ago',
    2,
  ],
  [
    'unit',
    'Unit tests',
    'feat/table',
    'Running',
    'info',
    '3m 05s',
    185,
    '6 min ago',
    6,
  ],
  [
    'ios',
    'Build iOS',
    'feat/table',
    'Failed',
    'danger',
    '8m 11s',
    491,
    '18 min ago',
    18,
  ],
  ['lint', 'Lint', 'main', 'Passed', 'success', '38s', 38, '1 hr ago', 60],
];

const sortKey = (run: Run, column: string): number =>
  column === 'duration' ? run[6] : run[8];

// The Plugin sorts its rows; Argo only reports the column and direction.
export function sortedRuns(sort: TableSort): readonly Run[] {
  const order = sort.direction === 'ascending' ? 1 : -1;

  return [...runs].sort(
    (a, b) => order * (sortKey(a, sort.column) - sortKey(b, sort.column)),
  );
}

interface RunRowProps {
  run: Run;
  onPress?: () => void;
  onRerun?: (id: string) => void;
}

const rerun = ({ run, onRerun }: RunRowProps): ReactElement => (
  <Action
    key="rerun"
    label="Re-run"
    icon="retry"
    onPress={() => onRerun?.(run[0])}
  />
);

export function runRow(props: RunRowProps): ReactElement {
  const [id, workflow, branch, status, tone, duration, , started] = props.run;

  return (
    <Table.Row key={id} id={id} onPress={props.onPress} actions={rerun(props)}>
      <Table.Cell column="workflow" text={workflow} />
      <Table.Cell column="branch" text={branch} />
      <Table.Cell column="status" text={status}>
        <Pill text={status} tone={tone} />
      </Table.Cell>
      <Table.Cell column="duration" text={duration} />
      <Table.Cell column="started" text={started} />
    </Table.Row>
  );
}
