import { layoutWidths, settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import { ChangeStage } from './change-stage';

const meta = {
  title: 'Tests/Sessions/ChangeStage',
  component: ChangeStage,
  args: { stage: 'open' },
} satisfies Meta<typeof ChangeStage>;

export default meta;

type Story = StoryObj<typeof meta>;

function modifiers(width: number): Story {
  return {
    render: () => (
      <>
        <ChangeStage stage="open" modifier="draft" />
        <ChangeStage stage="open" modifier="conflict" form="disc" />
      </>
    ),
    play: async ({ canvas }) => {
      await settleLayout(width);
      await expect(canvas.getByLabelText('Open, Draft Change')).toBeVisible();
      await expect(
        canvas.getByLabelText('Open, Conflict Change'),
      ).toBeVisible();
      await expect(canvas.getByText('Draft', { exact: true })).toBeVisible();
      await expect(canvas.getByText('Conflict', { exact: true })).toBeVisible();
      await expect(
        canvas.queryByLabelText(/PR|pull request/i),
      ).not.toBeInTheDocument();
    },
  };
}

export const ModifiersPhone = modifiers(layoutWidths.phone);

export const ModifiersWide = modifiers(layoutWidths.wide);
