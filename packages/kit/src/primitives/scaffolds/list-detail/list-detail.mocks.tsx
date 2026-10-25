import { useState, type ReactElement, type ReactNode } from 'react';
import { List } from '#primitives/lists/list';
import { ListItem } from '#primitives/lists/list-item';
import { Detail } from '#primitives/scaffolds/detail';
import { Metadata } from '#primitives/scaffolds/metadata';
import { Screen } from '#primitives/scaffolds/screen';
import { EmptyState } from '#primitives/status/empty-state';
import { ListDetail } from './list-detail';

interface Item {
  id: string;
  title: string;
  subtitle: string;
  detail: ReactNode;
}

export interface Example {
  title: string;
  empty: { title: string; description: string };
  items: Item[];
}

const issueDetail = (markdown: string, status: string): ReactNode => (
  <Detail
    markdown={markdown}
    metadata={
      <Metadata>
        <Metadata.StatusDot title="Status" text={status} tone="info" />
        <Metadata.Avatar title="Assignee" name="Ana Ruiz" />
      </Metadata>
    }
  />
);

export const syncIssue: Item = {
  id: '412',
  title: 'Sync fails on large repos',
  subtitle: 'In progress',
  detail: issueDetail(
    'Sync stops after a few minutes on repositories with more than 50,000 files.',
    'In progress',
  ),
};

export const csvIssue: Item = {
  id: '418',
  title: 'Add CSV export',
  subtitle: 'Todo',
  detail: issueDetail(
    'Export the visible Issues as CSV, with the columns shown.',
    'Todo',
  ),
};

// Unrelated: an Issue tracker Plugin's Issues.
export const issues: Example = {
  title: 'Issues',
  empty: {
    title: 'Select an Issue',
    description: 'Choose an Issue from the list.',
  },
  items: [syncIssue, csvIssue],
};

const projectFolder = (path: string): ReactNode => (
  <List appearance="plain">
    <ListItem title="Folder" value={path} />
  </List>
);

// Argo: the Server's Projects, each opening its Project page.
export const projects: Example = {
  title: 'Projects',
  empty: {
    title: 'Select a Project',
    description: 'Choose a Project from the list.',
  },
  items: [
    {
      id: 'argo-universal',
      title: 'argo-universal',
      subtitle: 'GitHub',
      detail: projectFolder('~/Developer/argo-universal'),
    },
    {
      id: 'website',
      title: 'website',
      subtitle: 'No remote',
      detail: projectFolder('~/Developer/website'),
    },
  ],
};

interface ExampleProps {
  example: Example;
  initial?: string;
  testID?: string;
}

interface Selection {
  example: Example;
  selected: string | undefined;
  onSelect: (id?: string) => void;
}

// A story has no router, so it holds the route's selection: a row selects its item, Back clears it.
export function ExampleListDetail(props: ExampleProps): ReactElement {
  const { example, testID } = props;
  const [selected, setSelected] = useState(props.initial);
  const selection = { example, selected, onSelect: setSelected };
  const detail = selected ? <ExampleDetail {...selection} /> : null;
  const list = <ExampleList {...selection} />;

  return (
    <ListDetail
      {...{ testID, list, detail }}
      empty={<EmptyState {...example.empty} />}
    />
  );
}

function ExampleList({ example, ...selection }: Selection): ReactElement {
  return (
    <Screen title={example.title}>
      <List appearance="cards">
        {example.items.map((item) => (
          <ExampleRow key={item.id} item={item} {...selection} />
        ))}
      </List>
    </Screen>
  );
}

function ExampleRow({
  item,
  selected,
  onSelect,
}: Omit<Selection, 'example'> & { item: Item }): ReactElement {
  return (
    <ListItem
      title={item.title}
      subtitle={item.subtitle}
      selected={item.id === selected}
      onPress={() => onSelect(item.id)}
    />
  );
}

function ExampleDetail({
  example,
  selected,
  onSelect,
}: Selection): ReactElement | null {
  const item = example.items.find((entry) => entry.id === selected);

  if (!item) return null;

  return (
    <Screen title={item.title} onBack={() => onSelect()}>
      {item.detail}
    </Screen>
  );
}
