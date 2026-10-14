import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { expect, waitFor, within } from 'storybook/test';
import { Button } from '#primitives/buttons/button';
import { Text } from '#primitives/display/text';
import { layoutWidths } from '../../../each-layout';
import { settleViewport } from '../../../settle-viewport';
import {
  Dialog,
  DialogCancel,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from './dialog';

const meta = {
  title: 'Tests/Dialog',
  render: (): React.JSX.Element => (
    <Dialog>
      {/* A content button forwards its ref, which the dialog needs to hand focus back. */}
      <DialogTrigger asChild>
        <Button custom label="Rename" />
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Rename the Project</DialogTitle>
        <Text>The folder keeps its name.</Text>
        <Button label="Save" />
        <DialogCancel label="Cancel" />
      </DialogContent>
    </Dialog>
  ),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

type Layout = keyof typeof layoutWidths;

const dialogName = { name: 'Rename the Project' };

// A phone raises a sheet that the backdrop, a swipe or Escape closes, so it has no close button; a wide window centres a dialog with one.
const closeButtonsAt: Record<Layout, number> = { phone: 0, tablet: 0, wide: 1 };

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

interface PointerCoords {
  clientX: number;
  clientY: number;
}

// Dragging the phone sheet down far enough closes it; a short drag lets it settle back open.
function swipesDown(distance: number, staysOpen: boolean): Story {
  return {
    beforeEach: (): Promise<void> => settleViewport(layoutWidths.phone),
    play: async ({ canvas, userEvent }) => {
      await userEvent.click(canvas.getByRole('button', rename));
      const dialog = await body.findByRole('dialog', dialogName);
      const title = within(dialog).getByText(dialogName.name);
      const { left, top } = title.getBoundingClientRect();

      const at = (y: number): PointerCoords => ({
        clientX: left + 4,
        clientY: top + 4 + y,
      });

      await userEvent.pointer([
        { keys: '[MouseLeft>]', target: title, coords: at(0) },
        { target: title, coords: at(distance / 2) },
        { target: title, coords: at(distance) },
        { keys: '[/MouseLeft]', target: title, coords: at(distance) },
      ]);
      await waitFor(() =>
        expect(body.queryByRole('dialog', dialogName) !== null).toBe(staysOpen),
      );
    },
  };
}

export const SheetClosesOnSwipeDown: Story = swipesDown(200, false);

export const SheetStaysOpenAfterShortDrag: Story = swipesDown(20, true);

// Cancel is the dialog's own action: it closes the sheet or the centred dialog.
function cancelsAt(layout: Layout): Story {
  return {
    beforeEach: (): Promise<void> => settleViewport(layoutWidths[layout]),
    play: async ({ canvas, userEvent }) => {
      const trigger = canvas.getByRole('button', rename);
      await userEvent.click(trigger);
      const dialog = await body.findByRole('dialog', dialogName);
      await userEvent.click(
        within(dialog).getByRole('button', { name: 'Cancel' }),
      );
      await waitFor(() =>
        expect(body.queryByRole('dialog', dialogName)).toBeNull(),
      );
    },
  };
}

export const SheetClosesOnCancel: Story = cancelsAt('phone');

export const DialogClosesOnCancel: Story = cancelsAt('wide');
