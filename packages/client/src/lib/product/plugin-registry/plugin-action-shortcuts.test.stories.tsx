import type { WireNode } from '@repo/contracts/plugins/wire';
import { ActionShortcutScope } from '@repo/kit/primitives/actions/action';
import { List } from '@repo/kit/primitives/lists/list';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor, within } from 'storybook/test';
import { PluginSlot } from './plugin-slot';

function actions(label: string): WireNode {
  return {
    type: 'ListItem',
    key: 'row',
    props: { title: label, onPress: { $event: 'onPress' } },
    children: [],
    slots: {
      actions: [
        {
          type: 'Action',
          key: 'copy',
          props: {
            label: 'Copy link',
            icon: 'copy',
            shortcut: { modifiers: ['alt'], key: 'i' },
            onPress: { $event: 'onPress' },
          },
          children: [],
          slots: {},
        },
      ],
    },
  };
}

const first = fn();

const later = fn();

const contributions = [
  {
    pluginId: 'first',
    name: 'First',
    root: actions('First row'),
    onEvent: first,
  },
  {
    pluginId: 'later',
    name: 'Later',
    root: actions('Later row'),
    onEvent: later,
  },
];

const meta = {
  title: 'Tests/Design System/Patterns/PluginRegistry/ActionShortcuts',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const FirstContributionOwnsShortcut: Story = {
  render: () => (
    <ActionShortcutScope>
      <List appearance="plain">
        <PluginSlot contributions={contributions} />
      </List>
    </ActionShortcutScope>
  ),
  play: async ({ canvas, canvasElement, userEvent }) => {
    first.mockClear();
    later.mockClear();
    const page = within(canvasElement.ownerDocument.body);
    await userEvent.pointer({
      keys: '[MouseRight]',
      target: canvas.getByText('First row'),
    });
    const firstItem = await page.findByRole('menuitem', { name: 'Copy link' });
    await waitFor(() => expect(within(firstItem).getByText('I')).toBeVisible());
    await userEvent.keyboard('{Escape}');
    await userEvent.pointer({
      keys: '[MouseRight]',
      target: canvas.getByText('Later row'),
    });
    const laterItem = await page.findByRole('menuitem', { name: 'Copy link' });
    await expect(within(laterItem).queryByText('I')).toBeNull();
    await userEvent.keyboard('{Escape}');
    await userEvent.click(canvas.getByText('First row'));
    await userEvent.keyboard('{Alt>}i{/Alt}');
    await expect(first).toHaveBeenCalledWith('row#actions/copy', {
      event: 'onPress',
    });
    await expect(later).not.toHaveBeenCalled();
  },
};
