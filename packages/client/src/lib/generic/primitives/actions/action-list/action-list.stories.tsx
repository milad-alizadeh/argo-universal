import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { ListItem } from '#primitives/lists/list-item';
import { kitArgTypes } from '#storybook/kit-arg-types';
import { Variation, Variations } from '../../../variations';
import { ChoiceExample } from './action-list-choice.mocks';
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
  { label: 'Add', icon: 'add', result: 'Added' },
  {
    label: 'Create',
    icon: 'branch',
    result: 'Created',
  },
  {
    label: 'Show archived',
    icon: 'archive',
    result: 'Showing archived',
  },
];

const meta = {
  title: 'Design System/Primitives/Actions/ActionList',
  component: ActionList,
  argTypes: kitArgTypes('ActionList'),
} satisfies Meta<typeof ActionList>;

export default meta;

type Story = StoryObj<typeof meta>;

const examples = [
  ['On a Page', <PageExample key="page" />],
  ['Choice (filter)', <ChoiceExample key="choice" />],
  [
    'Row, context menu',
    <RowExample key="session" title="Item" actions={sessions} />,
  ],
  [
    'Row, sections and destructive',
    <RowExample key="issue" title="Another item" actions={issues} />,
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
  const [result, setResult] = useState('Result');

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
