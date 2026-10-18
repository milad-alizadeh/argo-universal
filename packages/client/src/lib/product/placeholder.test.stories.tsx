import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import { layoutWidths } from '#lib/generic/each-layout';
import { settleViewport } from '#lib/generic/settle-viewport';
import { Placeholder } from './placeholder';

const noSession = {
  title: 'Select a Session',
  description: 'Choose a Session from the list.',
};

const meta = {
  title: 'Tests/Placeholder',
  component: Placeholder,
  parameters: { screenPreview: true },
  args: noSession,
} satisfies Meta<typeof Placeholder>;

export default meta;

type Story = StoryObj<typeof meta>;

// An empty pane names what it is waiting for and how to fill it, as a heading and its description, with no page header row.
function placeholderPane(width: number): Story {
  return {
    play: async ({ canvas }) => {
      await settleViewport(width);
      await expect(
        canvas.getByRole('heading', { name: noSession.title }),
      ).toBeVisible();
      await expect(canvas.getByText(noSession.description)).toBeVisible();
      await expect(canvas.queryAllByTestId('page-header')).toHaveLength(0);
    },
  };
}

export const Medium = placeholderPane(layoutWidths.tablet);

export const Wide = placeholderPane(layoutWidths.wide);
