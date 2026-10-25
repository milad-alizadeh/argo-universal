import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { type ReactElement, useState } from 'react';
import { View } from 'react-native';
import { expect, fn, waitFor, within } from 'storybook/test';
import { Text } from '#primitives/content/text';
import { FieldGroup } from '#primitives/fields/field-group';
import { Dialog, DialogContent } from '#primitives/overlays/dialog';
import { layoutWidths } from '../../../each-layout';
import { settleViewport } from '../../../settle-viewport';
import { ContextMenu } from './context-menu';

// The Dialog's field takes focus as it opens.
const focusOnOpen = { autoFocus: true };

const rowTitle = 'Item';

const onRename = fn();

const onArchive = fn();

const meta = {
  title: 'Tests/Design System/Primitives/Overlays/ContextMenu',
  component: ContextMenu,
  args: {
    groups: [
      [{ label: 'Rename', icon: 'rename', onPress: onRename }],
      [{ label: 'Archive', icon: 'archive', onPress: onArchive }],
    ],
    children: (
      <View>
        <Text>{rowTitle}</Text>
      </View>
    ),
  },
} satisfies Meta<typeof ContextMenu>;

export default meta;

type Story = StoryObj<typeof meta>;

const body = within(document.body);

type UserEvent = Parameters<NonNullable<Story['play']>>[0]['userEvent'];

const rightClick = (user: UserEvent, target: Element): Promise<void> =>
  user.pointer({ keys: '[MouseRight]', target });

async function opensWide(): Promise<void> {
  onRename.mockClear();
  onArchive.mockClear();
  await settleViewport(layoutWidths.wide);
}

// A right-click opens the menu with its actions in one list, no separator; choosing an action runs it and closes the menu.
export const RightClickRunsAnAction: Story = {
  beforeEach: opensWide,
  play: async ({ canvas, userEvent }) => {
    await rightClick(userEvent, canvas.getByText(rowTitle));
    const menu = within(await body.findByRole('menu'));
    await expect(menu.getAllByRole('menuitem')).toHaveLength(2);
    await expect(menu.queryByRole('separator')).toBeNull();
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
    await rightClick(userEvent, canvas.getByText(rowTitle));
    await body.findByRole('menu');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(body.queryByRole('menu')).toBeNull());
    await expect(onRename).not.toHaveBeenCalled();
  },
};

// An action that opens a dialog, as Rename does.
function RenameInDialog(): ReactElement {
  const [open, setOpen] = useState(false);
  const rename = { label: 'Rename', onPress: (): void => setOpen(true) };

  return (
    <>
      <ContextMenu groups={[[rename]]}>
        <Text>{rowTitle}</Text>
      </ContextMenu>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent accessibilityLabel="Dialog">
          <FieldGroup>
            <FieldGroup.Section>
              <FieldGroup.TextField
                title="Title"
                value=""
                onChangeText={fn()}
                {...focusOnOpen}
              />
            </FieldGroup.Section>
          </FieldGroup>
        </DialogContent>
      </Dialog>
    </>
  );
}

// The action runs once the menu has let go of focus, so the dialog it opens, a sheet or centred, keeps focus in its field.
function opensDialogAt(layout: 'phone' | 'wide'): Story {
  return {
    beforeEach: () => settleViewport(layoutWidths[layout]),
    render: () => <RenameInDialog />,
    play: async ({ canvas, userEvent }) => {
      await userEvent.pointer({
        keys: '[MouseRight]',
        target: canvas.getByText(rowTitle),
      });
      const menu = within(await body.findByRole('menu'));
      await userEvent.click(menu.getByRole('menuitem', { name: 'Rename' }));
      const field = await body.findByRole('textbox', { name: 'Title' });
      await waitFor(() => expect(field).toHaveFocus());
    },
  };
}

export const OpensDialogOnPhone = opensDialogAt('phone');

export const OpensDialogWide = opensDialogAt('wide');
