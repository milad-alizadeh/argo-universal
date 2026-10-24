import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { expect, fn } from 'storybook/test';
import { Button } from '#primitives/actions/button';
import {
  Action,
  ActionButtons,
  ActionShortcutScope,
  ContextActions,
} from './index';

const choose = fn();

const open = fn();

const meta = {
  title: 'Tests/Design System/Primitives/Actions/Action/Focus',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const FocusedRow: Story = {
  render: () => (
    <ContextActions
      actions={
        <>
          <Action
            label="Rename"
            icon="rename"
            shortcut={{ modifiers: [], key: 'Enter' }}
            onPress={() => choose('rename')}
          />
          <Action
            label="Archive"
            icon="archive"
            disabled
            shortcut={{ modifiers: [], key: 'Backspace' }}
            onPress={() => choose('archive')}
          />
        </>
      }
    >
      <Button label="Row" onPress={open} />
    </ContextActions>
  ),
  play: async ({ canvas, userEvent }) => {
    choose.mockClear();
    open.mockClear();
    await userEvent.click(canvas.getByRole('button', { name: 'Row' }));
    open.mockClear();
    await userEvent.keyboard('{Enter}');
    await expect(choose).toHaveBeenCalledTimes(1);
    await expect(choose).toHaveBeenLastCalledWith('rename');
    await expect(open).not.toHaveBeenCalled();
    await userEvent.keyboard('{Backspace}');
    await expect(choose).toHaveBeenCalledTimes(1);
  },
};

function RemovableFirst(): React.JSX.Element {
  const [shown, setShown] = useState(true);

  return (
    <ActionShortcutScope>
      {shown && (
        <ActionButtons
          actions={
            <Action
              key="first"
              label="First"
              icon="add"
              shortcut={{ modifiers: ['alt'], key: 'i' }}
              onPress={() => {
                choose('first');
                setShown(false);
              }}
            />
          }
        />
      )}
      <ActionButtons
        actions={
          <Action
            key="later"
            label="Later"
            icon="archive"
            shortcut={{ modifiers: ['alt'], key: 'i' }}
            onPress={() => choose('later')}
          />
        }
      />
    </ActionShortcutScope>
  );
}

export const OwnershipReleased: Story = {
  render: () => <RemovableFirst />,
  play: async ({ canvas, userEvent }) => {
    choose.mockClear();
    await userEvent.keyboard('{Alt>}i{/Alt}');
    await expect(choose).toHaveBeenLastCalledWith('first');
    await expect(canvas.queryByRole('button', { name: 'First' })).toBeNull();
    await userEvent.keyboard('{Alt>}i{/Alt}');
    await expect(choose).toHaveBeenCalledTimes(2);
    await expect(choose).toHaveBeenLastCalledWith('later');
  },
};
