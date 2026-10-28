import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor, within } from 'storybook/test';
import { type LayoutName, settleLayout } from '#mocks/story-layout';
import { AnchoredList } from './popover.stories';

const meta = {
  title: 'Tests/Design System/Primitives/Overlays/Popover/List',
  render: AnchoredList.render,
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const fruits = ['Apple', 'Banana', 'Cherry'];

const bottom = (element: HTMLElement): number =>
  element.getBoundingClientRect().bottom;

// A fitted List in a popover draws every row: a phone's popover is a sheet, which once drew only its title.
function drawsItsRows(layout: LayoutName): Story {
  return {
    beforeEach: (): Promise<void> => settleLayout(layout),
    play: async ({ canvas, userEvent }) => {
      await userEvent.click(
        canvas.getByRole('button', { name: 'Choose a fruit' }),
      );
      const popover = await within(document.body).findByRole('dialog', {
        name: 'Fruit',
      });

      for (const fruit of fruits) {
        const row = await within(popover).findByText(fruit);

        await waitFor(() =>
          expect(bottom(row)).toBeLessThanOrEqual(bottom(popover)),
        );
      }
    },
  };
}

export const DrawsItsRowsPhone: Story = drawsItsRows('phone');

export const DrawsItsRowsWide: Story = drawsItsRows('wide');
