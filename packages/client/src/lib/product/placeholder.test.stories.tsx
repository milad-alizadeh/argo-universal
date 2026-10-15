import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import { layoutWidths } from '#lib/generic/each-layout';
import { settleViewport } from '#lib/generic/settle-viewport';
import { Placeholder } from './placeholder';

const issues = { title: 'Issues', description: 'Issues will appear here.' };

const atlas = { title: 'Atlas', description: 'Atlas will appear here.' };

const meta = {
  title: 'Tests/Placeholder',
  component: Placeholder,
  parameters: { screenPreview: true },
  args: issues,
} satisfies Meta<typeof Placeholder>;

export default meta;

type Story = StoryObj<typeof meta>;

// The Issues and Atlas pages until they are built: each names itself and says what will appear, and only a wide window draws the page's own header row; a narrow one leaves the title to the native header.
function placeholderPage(page: typeof issues, width: number): Story {
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

export const IssuesPhone = placeholderPage(issues, layoutWidths.phone);

export const IssuesWide = placeholderPage(issues, layoutWidths.wide);

export const AtlasPhone = placeholderPage(atlas, layoutWidths.phone);

export const AtlasWide = placeholderPage(atlas, layoutWidths.wide);
