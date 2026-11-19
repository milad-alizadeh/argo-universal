import type { WireNode } from '@repo/contracts/plugins/wire';

type Parts = Pick<WireNode, 'props'> & Partial<Pick<WireNode, 'slots'>>;

const node = (type: string, key: string, parts: Parts): WireNode => ({
  slots: {},
  children: [],
  ...parts,
  type,
  key,
});

interface Status {
  name: string;
  tone: string;
  icon: string;
}

const statuses: readonly [Status, Status, Status] = [
  { name: 'To Do', tone: 'muted', icon: 'pending' },
  { name: 'In Progress', tone: 'info', icon: 'pending' },
  { name: 'Done', tone: 'done', icon: 'passed' },
];

const statusAt = (index: number): Status =>
  statuses[index % statuses.length] ?? statuses[0];

const label = (key: string, icon: string, text: string): WireNode =>
  node('Label', key, {
    props: { icon: { sf: icon, material: icon }, text },
  });

// The row's marks: who has it, how urgent it is, then its status.
const metaOf = (index: number, status: Status): WireNode[] => [
  label(
    'assignee',
    'person',
    index % 3 === 0 ? 'Unassigned' : `Person ${index % 7}`,
  ),
  label('priority', 'flag', 'Medium'),
  node('Pill', 'status', { props: { text: status.name, tone: status.tone } }),
];

const openInJira = (key: string): WireNode =>
  node('Action', 'open-in-jira', {
    props: {
      label: 'Open in Jira',
      icon: 'external-link',
      onPress: { action: 'openUrl', url: `https://example.test/${key}` },
    },
  });

// What a row says and where it goes, as the Jira Plugin sends it.
type RowProps = {
  id: string;
  title: string;
  subtitle: string;
  finished: boolean;
  onPress: { operation: string; args: { key: string } };
};

const rowProps = (index: number, status: Status): RowProps => {
  const key = `PROJ-${index + 1}`;

  return {
    id: key,
    title: `Issue ${index + 1} ${'with a summary '.repeat((index % 4) + 1)}`,
    subtitle: key,
    finished: status.name === 'Done',
    onPress: { operation: 'open', args: { key } },
  };
};

const statusMark = (status: Status): WireNode =>
  node('Icon', 'mark', {
    props: { name: status.icon, tone: status.tone, size: 'sm' },
  });

// A Jira issue row as `plugins/jira/issue-rows.tsx` draws it: a status mark, the key under the title, its marks and a menu.
const issueRow = (index: number): WireNode => {
  const status = statusAt(index);
  const key = `PROJ-${index + 1}`;

  return node('ListItem', key, {
    props: rowProps(index, status),
    slots: {
      leading: [statusMark(status)],
      meta: metaOf(index, status),
      actions: [openInJira(key)],
    },
  });
};

// A Jira issue list as the Plugin sends it, `rowCount` long.
export const issueListTree = (rowCount: number): WireNode => ({
  ...node('List', 'issues', {
    props: {
      accessibilityLabel: 'Jira issues',
      appearance: 'plain',
      density: 'compact',
      pagination: { hasMore: false, onLoadMore: { loadMore: true } },
    },
  }),
  children: Array.from({ length: rowCount }, (_, index) => issueRow(index)),
});
