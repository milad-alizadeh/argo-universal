import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { expect, waitFor, within } from 'storybook/test';
import { layoutWidths } from '../each-layout';
import { settleViewport } from '../settle-viewport';
import { Button } from './button';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from './dialog';
import { Text } from './text';

const meta = {
  title: 'Tests/Dialog',
  render: (): React.JSX.Element => (
    <Dialog>
      {/* A content button forwards its ref, which the dialog needs to hand focus back. */}
      <DialogTrigger asChild>
        <Button appearance="content" label="Rename" />
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Rename the Project</DialogTitle>
        <Text>The folder keeps its name.</Text>
        <Button label="Save" />
      </DialogContent>
    </Dialog>
  ),
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
type Layout = keyof typeof layoutWidths;

const dialogName = { name: 'Rename the Project' };

// A phone raises a sheet that the backdrop, a swipe or Escape closes, so it has no close button; a wide window centres a dialog with one.
const closeButtonsAt: Record<Layout, number> = { phone: 0, wide: 1 };

const body = within(document.body);
const rename = { name: 'Rename' };

function opensAt(layout: Layout): Story {
  return {
    beforeEach: (): Promise<void> => settleViewport(layoutWidths[layout]),
    play: async ({ canvas, userEvent }) => {
      await userEvent.click(canvas.getByRole('button', rename));
      const dialog = await body.findByRole('dialog', dialogName);
      await expect(
        within(dialog).queryAllByRole('button', { name: 'Close' }),
      ).toHaveLength(closeButtonsAt[layout]);
      await userEvent.keyboard('{Escape}');
      await waitFor(() =>
        expect(body.queryByRole('dialog', dialogName)).toBeNull(),
      );
    },
  };
}

export const SheetOnPhone: Story = opensAt('phone');
export const CentredOnDesktop: Story = opensAt('wide');

// Tabbing past the last control comes back round inside the dialog, never to the page behind it.
function trapsFocusAt(layout: Layout): Story {
  return {
    beforeEach: (): Promise<void> => settleViewport(layoutWidths[layout]),
    play: async ({ canvas, userEvent }) => {
      await userEvent.click(canvas.getByRole('button', rename));
      const dialog = await body.findByRole('dialog', dialogName);
      await userEvent.tab();
      await userEvent.tab();
      await userEvent.tab();
      await expect(dialog.contains(document.activeElement)).toBe(true);
    },
  };
}

export const FocusStaysInSheet: Story = trapsFocusAt('phone');
export const FocusStaysInDialog: Story = trapsFocusAt('wide');

function returnsFocusAt(layout: Layout): Story {
  return {
    beforeEach: (): Promise<void> => settleViewport(layoutWidths[layout]),
    play: async ({ canvas, userEvent }) => {
      const trigger = canvas.getByRole('button', rename);
      await userEvent.click(trigger);
      await body.findByRole('dialog', dialogName);
      await userEvent.keyboard('{Escape}');
      await waitFor(() => expect(trigger).toHaveFocus());
    },
  };
}

export const SheetReturnsFocus: Story = returnsFocusAt('phone');
export const DialogReturnsFocus: Story = returnsFocusAt('wide');
