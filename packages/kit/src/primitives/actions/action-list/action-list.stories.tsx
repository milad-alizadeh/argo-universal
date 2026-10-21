import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { kitArgTypes } from '#kit/kit-arg-types';
import { ListItem } from '#primitives/lists/list-item';
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

// Every story draws Action children and tracks what the last press did, so each keeps a render.
export const OnAPage: Story = { render: () => <PageExample /> };

export const Choice: Story = {
  render: () => <ChoiceExample />,
  parameters: {
    docs: {
      description: {
        story: 'A submenu Action whose Sections are each one single choice.',
      },
    },
  },
};

export const ContextMenu: Story = {
  render: () => <RowExample title="Item" actions={sessions} />,
  parameters: {
    docs: {
      description: {
        story: 'A row is the trigger, and each action has a shortcut.',
      },
    },
  },
};

export const Destructive: Story = {
  render: () => <RowExample title="Another item" actions={issues} />,
  parameters: {
    docs: {
      description: {
        story: 'A context row with a disabled and a danger action.',
      },
    },
  },
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
