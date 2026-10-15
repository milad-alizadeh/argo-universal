import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor, within } from 'storybook/test';
import { layoutWidths } from '../../../each-layout';
import { settleViewport } from '../../../settle-viewport';
import { PagedSheet } from './sheet.stories';

const meta = {
  title: 'Tests/Sheet',
  component: PagedSheet,
} satisfies Meta<typeof PagedSheet>;

export default meta;

type Story = StoryObj<typeof meta>;

const body = within(document.body);

const fruitPage = { name: 'Select Fruit' };

// A link pushes its page, Back returns to the page below, and a pick on the pushed page goes back with the new value.
function pagesAt(width: number): Story {
  return {
    beforeEach: (): Promise<void> => settleViewport(width),
    play: async ({ canvas, userEvent }) => {
      await userEvent.click(canvas.getByRole('button', { name: 'Settings' }));
      await userEvent.click(await body.findByRole('button', { name: /Fruit/ }));
      await expect(await body.findByRole('heading', fruitPage)).toBeVisible();
      await userEvent.click(
        body.getByRole('button', { name: 'Back to Settings' }),
      );
      await waitFor(() =>
        expect(body.queryByRole('heading', fruitPage)).toBeNull(),
      );
      await userEvent.click(body.getByRole('button', { name: /Fruit/ }));
      await userEvent.click(
        await body.findByRole('button', { name: 'Cherry' }),
      );
      await expect(
        await body.findByRole('button', { name: /Fruit.*Cherry/ }),
      ).toBeVisible();
    },
  };
}

export const PagesInDrawer: Story = pagesAt(layoutWidths.phone);

export const PagesInPopover: Story = pagesAt(layoutWidths.wide);
