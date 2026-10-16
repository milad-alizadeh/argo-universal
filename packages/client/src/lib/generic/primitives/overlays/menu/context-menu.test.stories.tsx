import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { expect, fn, waitFor, within } from 'storybook/test';
import { Text } from '#primitives/display/text';
import { layoutWidths } from '../../../each-layout';
import { settleViewport } from '../../../settle-viewport';
import { ContextMenu } from './context-menu';

const onRename = fn();

const onArchive = fn();

const meta = {
  title: 'Tests/ContextMenu',
  component: ContextMenu,
  args: {
    groups: [
      [{ label: 'Rename', icon: 'rename', onPress: onRename }],
      [{ label: 'Archive', icon: 'archive', onPress: onArchive }],
    ],
    children: (
      <View>
        <Text>Build the Session layout</Text>
      </View>
    ),
  },
} satisfies Meta<typeof ContextMenu>;

export default meta;

type Story = StoryObj<typeof meta>;

const body = within(document.body);

async function opensWide(): Promise<void> {
  onRename.mockClear();
  onArchive.mockClear();
  await settleViewport(layoutWidths.wide);
}

// A right-click opens the menu with its groups apart; choosing an action runs it and closes the menu.
export const RightClickRunsAnAction: Story = {
  beforeEach: opensWide,
  play: async ({ canvas, userEvent }) => {
    await userEvent.pointer({
      keys: '[MouseRight]',
      target: canvas.getByText('Build the Session layout'),
    });
    const menu = within(await body.findByRole('menu'));
    await expect(menu.getAllByRole('menuitem')).toHaveLength(2);
    await expect(menu.getByRole('separator')).toBeInTheDocument();
    await userEvent.click(menu.getByRole('menuitem', { name: 'Rename' }));
    await expect(onRename).toHaveBeenCalledOnce();
    await expect(onArchive).not.toHaveBeenCalled();
    await waitFor(() => expect(body.queryByRole('menu')).toBeNull());
  },
};

// Escape closes the menu without running anything.
export const EscapeCloses: Story = {
  beforeEach: opensWide,
  play: async ({ canvas, userEvent }) => {
    await userEvent.pointer({
      keys: '[MouseRight]',
      target: canvas.getByText('Build the Session layout'),
    });
    await body.findByRole('menu');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(body.queryByRole('menu')).toBeNull());
    await expect(onRename).not.toHaveBeenCalled();
  },
};
