import {
  Action,
  ActionList,
  Page,
  Pill,
  Table,
  useState,
  type PluginProps,
} from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';

type TableProps = PluginProps['Table'];

type Sort = NonNullable<TableProps['sort']>;

type Run = {
  id: string;
  workflow: string;
  branch: string;
  status: string;
  tone: PluginProps['Pill']['tone'];
  started: string;
  order: number;
};

type Rerun = (run: Run) => void;

const columns: TableProps['columns'] = [
  { id: 'workflow', title: 'Workflow' },
  { id: 'branch', title: 'Branch', width: 'lg' },
  { id: 'status', title: 'Status', width: 'md' },
  {
    id: 'started',
    title: 'Started',
    width: 'md',
    align: 'end',
    sortable: true,
  },
];

const runs: Run[] = [
  {
    id: 'typecheck',
    workflow: 'Typecheck',
    branch: 'main',
    status: 'Passed',
    tone: 'success',
    started: '2 min ago',
    order: 1,
  },
  {
    id: 'unit',
    workflow: 'Unit tests',
    branch: 'feat/table',
    status: 'Running',
    tone: 'info',
    started: '6 min ago',
    order: 2,
  },
  {
    id: 'ios',
    workflow: 'Build iOS',
    branch: 'feat/table',
    status: 'Failed',
    tone: 'danger',
    started: '18 min ago',
    order: 3,
  },
  {
    id: 'lint',
    workflow: 'Lint',
    branch: 'main',
    status: 'Passed',
    tone: 'success',
    started: '1 hr ago',
    order: 4,
  },
];

const firstSort: Sort = { column: 'started', direction: 'ascending' };

// Argo reports the column and direction; the Plugin sorts its own rows.
const sorted = (sort: Sort): Run[] => {
  const order = sort.direction === 'ascending' ? 1 : -1;

  return runs.toSorted((a, b) => order * (a.order - b.order));
};

const rerunAction = (run: Run, onRerun: Rerun): JSX.Element => (
  <ActionList>
    <Action label="Re-run" icon="retry" onPress={() => onRerun(run)} />
  </ActionList>
);

function RunRow({ run, onRerun }: { run: Run; onRerun: Rerun }): JSX.Element {
  return (
    <Table.Row id={run.id} actions={rerunAction(run, onRerun)}>
      <Table.Cell column="workflow" text={run.workflow} />
      <Table.Cell column="branch" text={run.branch} />
      <Table.Cell column="status" text={run.status}>
        <Pill text={run.status} tone={run.tone} />
      </Table.Cell>
      <Table.Cell column="started" text={run.started} />
    </Table.Row>
  );
}

const renderRun =
  (onRerun: Rerun) =>
  (run: Run): JSX.Element => (
    <RunRow key={run.id} run={run} onRerun={onRerun} />
  );

const rerunTitle =
  (setTitle: (title: string) => void): Rerun =>
  (ran) =>
    setTitle(`Re-ran ${ran.workflow}`);

function RunsTable({ onRerun }: { onRerun: Rerun }): JSX.Element {
  const [sort, setSort] = useState(firstSort);

  // `onSortChange` is typed from every Table prop, so the row type is named rather than inferred from `items`.
  return (
    <Table<Run>
      accessibilityLabel="CI runs"
      columns={columns}
      sort={sort}
      onSortChange={setSort}
      items={sorted(sort)}
      renderItem={renderRun(onRerun)}
    />
  );
}

// A table of CI runs: columns on wide screens, a list on phones.
export function HelloRunsPage(): JSX.Element {
  const [title, setTitle] = useState('Runs');

  return (
    <Page title={title}>
      <RunsTable onRerun={rerunTitle(setTitle)} />
    </Page>
  );
}
