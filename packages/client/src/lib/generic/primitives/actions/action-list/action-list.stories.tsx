import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { ListItem } from '#primitives/lists/list-item';
import { Variation, Variations } from '../../../variations';
import { Action, ActionList, type PressActionProps } from './index';

interface DemoAction extends Omit<PressActionProps, 'onPress'> {
  result: string;
}

const sessions: DemoAction[] = [
  {
    label: 'Rename',
    icon: 'rename',
    shortcut: { modifiers: [], key: 'Enter' },
    result: 'Ready to rename',
  },
  {
    label: 'Copy link',
    icon: 'copy',
    shortcut: { modifiers: ['meta', 'shift'], key: 'c' },
    result: 'Link copied',
  },
  {
    label: 'Archive',
    icon: 'archive',
    shortcut: { modifiers: ['meta'], key: 'Backspace' },
    result: 'Archived',
  },
];

const issues: DemoAction[] = [
  { label: 'Assign', icon: 'agent', result: 'Assigned to you' },
  { label: 'Change status', icon: 'check', disabled: true, result: '' },
  { label: 'Delete', icon: 'delete', tone: 'danger', result: 'Deleted' },
];

const projects: DemoAction[] = [
  { label: 'Add Project', icon: 'add', result: 'Project added' },
  {
    label: 'Import from GitHub',
    icon: 'repository',
    result: 'Imported from GitHub',
  },
  {
    label: 'Show archived',
    icon: 'archive',
    result: 'Showing archived Projects',
  },
];

const meta = {
  title: 'Design System/Primitives/Actions/ActionList',
  component: ActionList,
} satisfies Meta<typeof ActionList>;

export default meta;

type Story = StoryObj<typeof meta>;

const examples = [
  ['On a Page', <PageExample key="page" />],
  [
    'Argo · Session row',
    <RowExample
      key="session"
      title="Build the Session layout"
      actions={sessions}
    />,
  ],
  [
    'Issue row · Sections and destructive',
    <RowExample
      key="issue"
      title="Sync fails on large repos"
      actions={issues}
    />,
  ],
] as const;

export const Overview: Story = {
  name: 'ActionList',
  render: () => (
    <Variations>
      {examples.map(([label, example]) => (
        <Variation key={label} label={label}>
          {example}
        </Variation>
      ))}
    </Variations>
  ),
};

function PageExample(): React.JSX.Element {
  const [result, setResult] = useState('Projects');

  return (
    <>
      <ListItem title={result} />
      <ActionList>{demoActions(projects, setResult)}</ActionList>
    </>
  );
}

function RowExample({
  title,
  actions,
}: {
  title: string;
  actions: DemoAction[];
}): React.JSX.Element {
  const [result, setResult] = useState(title);

  return (
    <ActionList variant="context" trigger={<ListItem title={result} />}>
      {demoActions(actions, setResult)}
    </ActionList>
  );
}

function demoActions(
  actions: DemoAction[],
  onAction: (result: string) => void,
): React.JSX.Element {
  return (
    <ActionList.Section>
      {actions.map((action) => demoAction(action, onAction))}
    </ActionList.Section>
  );
}

function demoAction(
  { result, ...action }: DemoAction,
  onAction: (result: string) => void,
): React.JSX.Element {
  return (
    <Action key={action.label} {...action} onPress={() => onAction(result)} />
  );
}
