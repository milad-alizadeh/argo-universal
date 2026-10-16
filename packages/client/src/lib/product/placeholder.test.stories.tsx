import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import { layoutWidths } from '#lib/generic/each-layout';
import { settleViewport } from '#lib/generic/settle-viewport';
import { Placeholder } from './placeholder';

const agent = {
  title: 'Agent',
  description: 'Settings for Codex will appear here.',
};

const meta = {
  title: 'Tests/Placeholder',
  component: Placeholder,
  parameters: { screenPreview: true },
  args: agent,
} satisfies Meta<typeof Placeholder>;

export default meta;

type Story = StoryObj<typeof meta>;

// The Agent placeholder: each names itself and says what will appear, and only a wide window draws the page's own header row; a narrow one leaves the title to the native header.
function placeholderPage(page: typeof agent, width: number): Story {
  const headerRows = width >= layoutWidths.wide ? 1 : 0;

  return {
    args: page,
    play: async ({ canvas }) => {
      await settleViewport(width);
      await expect(canvas.getByText(page.description)).toBeVisible();
      await expect(
        canvas.getAllByRole('heading', { name: page.title }).length,
      ).toBeGreaterThan(0);
      await expect(canvas.queryAllByTestId('page-header')).toHaveLength(
        headerRows,
      );
    },
  };
}

export const AgentPhone = placeholderPage(agent, layoutWidths.phone);

export const AgentWide = placeholderPage(agent, layoutWidths.wide);
