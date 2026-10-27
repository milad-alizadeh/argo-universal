import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import { expect, fn, waitFor, within } from 'storybook/test';
import { layoutWidths, settleLayout } from '#mocks/story-layout';
import { Action, ActionShortcutScope } from '#primitives/actions/action';
import { ListItem } from '#primitives/lists/list-item';
import { List } from './list';

const added = fn();

const meta = {
  title: 'Tests/Design System/Primitives/Lists/List/SectionActions',
  render: (): ReactElement => (
    <ActionShortcutScope>
      <List>
        <List.Section
          title="Builds"
          actions={
            <Action
              key="add"
              label="Add build"
              icon="add"
              shortcut={{ modifiers: ['alt'], key: 'b' }}
              onPress={added}
            />
          }
        >
          <ListItem title="Nightly" />
        </List.Section>
      </List>
    </ActionShortcutScope>
  ),
  beforeEach: (): void => {
    added.mockClear();
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// A wide header draws its Actions as buttons, each spoken with the section's title, and runs their shortcuts while it is shown.
export const WideButtons: Story = {
  play: async ({ canvas, userEvent }) => {
    await settleLayout('wide');
    await userEvent.click(
      await canvas.findByRole('button', { name: 'Add build, Builds' }),
    );
    await expect(added).toHaveBeenCalledOnce();
    await userEvent.keyboard('{Alt>}b{/Alt}');
    await expect(added).toHaveBeenCalledTimes(2);
  },
};

// Below a wide window the header draws no buttons: its context menu holds the Actions.
export const CompactContextMenu: Story = {
  play: async ({ canvas, canvasElement, userEvent }) => {
    await settleLayout('phone');
    const title = await canvas.findByRole('heading', { name: 'Builds' });

    await waitFor(() =>
      expect(canvas.queryByRole('button', { name: /^Add build/ })).toBeNull(),
    );
    await userEvent.pointer({ keys: '[MouseRight]', target: title });
    const page = within(canvasElement.ownerDocument.body);
    await userEvent.click(
      await page.findByRole('menuitem', { name: 'Add build' }),
    );
    await waitFor(() => expect(added).toHaveBeenCalledOnce());
  },
};
