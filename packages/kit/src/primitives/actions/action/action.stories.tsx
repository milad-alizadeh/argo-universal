import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { fn } from 'storybook/test';
import { kitArgTypes } from '#kit/kit-arg-types';
import { ListItem } from '#primitives/lists/list-item';
import {
  contextMenuActions,
  type DemoAction,
  destructiveActions,
  pageActions,
} from './action-fixtures';
import { Action, ActionButtons, ContextActions } from './index';

const meta = {
  title: 'Design System/Primitives/Actions/Action',
  component: Action,
  argTypes: kitArgTypes('Action'),
  // The Action itself draws nothing; each story draws Actions where a Screen, a row or a button holds them.
  args: { label: 'Add', icon: 'add', onPress: fn() },
} satisfies Meta<typeof Action>;

export default meta;

type Story = StoryObj<typeof meta>;

// Every story draws Actions and tracks what the last press did, so each keeps a render.
export const OnAScreen: Story = { render: () => <ScreenExample /> };

export const ContextMenu: Story = {
  render: () => <RowExample {...contextMenuActions} />,
  parameters: {
    docs: {
      description: {
        story: 'A row is the trigger, and each action has a shortcut.',
      },
    },
  },
};

export const Destructive: Story = {
  render: () => <RowExample {...destructiveActions} />,
  parameters: {
    docs: {
      description: {
        story: 'A context row with a disabled and a danger action.',
      },
    },
  },
};

function ScreenExample(): React.JSX.Element {
  const [result, setResult] = useState('Result');

  return (
    <>
      <ListItem title={result} />
      <ActionButtons actions={demoActions(pageActions, setResult)} />
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
    <ContextActions actions={demoActions(actions, setResult)}>
      <ListItem title={result} />
    </ContextActions>
  );
}

function demoActions(
  actions: DemoAction[],
  onAction: (result: string) => void,
): React.JSX.Element {
  return (
    <Action.Section>
      {actions.map((action) => demoAction(action, onAction))}
    </Action.Section>
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
