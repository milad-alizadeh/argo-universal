import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { kitArgTypes } from '#kit/kit-arg-types';
import { ListItem } from '#primitives/lists/list-item';
import { ChoiceExample } from './action-list-choice.mocks';
import {
  contextMenuActionList,
  type DemoAction,
  destructiveActionList,
  pageActions,
} from './action-list-fixtures';
import { Action, ActionList } from './index';

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
  render: () => <RowExample {...contextMenuActionList} />,
  parameters: {
    docs: {
      description: {
        story: 'A row is the trigger, and each action has a shortcut.',
      },
    },
  },
};

export const Destructive: Story = {
  render: () => <RowExample {...destructiveActionList} />,
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
      <ActionList>{demoActions(pageActions, setResult)}</ActionList>
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
