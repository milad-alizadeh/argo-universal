import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { Pressable } from 'react-native';
import { expect, waitFor, within } from 'storybook/test';
import { Button } from '#primitives/actions/button';
import { Text } from '#primitives/content/text';
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
      {/* A Pressable forwards its ref, which the dialog needs to hand focus back. */}
      <DialogTrigger>
        <Pressable role="button">
          <Text>Rename</Text>
        </Pressable>
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

// A phone raises a sheet that the backdrop, a swipe or Escape closes, so it has no close button; from medium up a centred dialog has one.
const closeButtonsAt: Record<Layout, number> = { phone: 0, tablet: 1, wide: 1 };

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

export const CentredOnTablet: Story = opensAt('tablet');

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

// The drawer reads page coordinates, which a synthetic pointer event has only when it is given them.
interface PointerCoords {
  clientX: number;
  clientY: number;
  pageX: number;
  pageY: number;
}

// vaul ignores drags for its first 500 ms open, while the drawer rises; nothing on the page shows when that ends.
const dragLockMs = 500;

function dragLockEnds(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, dragLockMs + 100));
}

// Dragging the phone sheet down far enough closes it; a short drag lets it settle back open.
function swipesDown(distance: number, staysOpen: boolean): Story {
  return {
    beforeEach: (): Promise<void> => settleViewport(layoutWidths.phone),
    play: async ({ canvas, userEvent }) => {
      await userEvent.click(canvas.getByRole('button', rename));
      const dialog = await body.findByRole('dialog', dialogName);
      await dragLockEnds();
      // Start in the empty top edge of the semantic dialog surface, above its selectable title.
      const { left, top, width } = dialog.getBoundingClientRect();

      const at = (y: number): PointerCoords => ({
        clientX: left + width / 2,
        clientY: top + 4 + y,
        pageX: left + width / 2 + window.scrollX,
        pageY: top + 4 + y + window.scrollY,
      });

      await userEvent.pointer([
        { keys: '[MouseLeft>]', target: dialog, coords: at(0) },
        { target: dialog, coords: at(distance / 2) },
        { target: dialog, coords: at(distance) },
        { keys: '[/MouseLeft]', target: dialog, coords: at(distance) },
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

export const TabletDialogClosesOnCancel: Story = cancelsAt('tablet');
