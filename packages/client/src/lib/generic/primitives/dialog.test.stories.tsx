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
      <DialogTrigger asChild>
        <Button label="Rename" />
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Rename the Project</DialogTitle>
        <Text>The folder keeps its name.</Text>
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

function opensAt(layout: Layout): Story {
  return {
    beforeEach: (): Promise<void> => settleViewport(layoutWidths[layout]),
    play: async ({ canvas, userEvent }) => {
      await userEvent.click(canvas.getByRole('button', { name: 'Rename' }));
      const body = within(document.body);
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
