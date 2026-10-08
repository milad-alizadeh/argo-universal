import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactNode } from 'react';
import { expect, fn, waitFor } from 'storybook/test';
import { layoutWidths } from '../../mocks/each-layout';
import { shortPlanProposal } from '../../mocks/plan-proposal-mock';
import {
  PermissionRequestPreview,
  RequestFrame,
} from '../../mocks/request-preview';
import { settleViewport } from '../../mocks/settle-viewport';
import { ContentLayout } from './ContentLayout';
import type { PermissionRequestProps } from './PermissionRequest';
import {
  PlanProposalCard,
  type PlanProposalCardProps,
} from './PlanProposalCard';

interface ShortcutPreviewProps {
  width: number;
  secondCard: boolean;
  onAnswer: PlanProposalCardProps['onAnswer'];
  onPermissionAnswer: PermissionRequestProps['onAnswer'];
}

function ShortcutPreview({
  width,
  secondCard,
  onAnswer,
  onPermissionAnswer,
}: ShortcutPreviewProps): ReactNode {
  return (
    <RequestFrame>
      <ContentLayout className="gap-4" style={{ width }}>
        <PlanProposalCard
          proposal={shortPlanProposal}
          onAnswer={onAnswer}
          state={{ kind: 'open' }}
        />
        {secondCard && (
          <PermissionRequestPreview onAnswer={onPermissionAnswer} />
        )}
      </ContentLayout>
    </RequestFrame>
  );
}

const meta = {
  title: 'Tests/RequestCard',
  component: ShortcutPreview,
  parameters: { previewPadding: false },
  args: {
    width: layoutWidths.wide,
    secondCard: false,
    onAnswer: fn(),
    onPermissionAnswer: fn(),
  },
} satisfies Meta<typeof ShortcutPreview>;
export default meta;
type Story = StoryObj<typeof meta>;

export const NarrowContent: Story = {
  args: { width: layoutWidths.phone },
  play: async ({ canvas, userEvent, args }) => {
    await settleViewport(layoutWidths.wide);
    await waitFor(() =>
      expect(
        canvas.getByRole('button', { name: 'Approve' }).getBoundingClientRect()
          .width,
      ).toBeGreaterThan(layoutWidths.phone / 3),
    );
    await userEvent.click(canvas.getByText('Approve this plan?'));
    await userEvent.keyboard('{Enter}');
    await expect(args.onAnswer).not.toHaveBeenCalled();
  },
};

export const MultipleActiveCards: Story = {
  args: { secondCard: true },
  play: async ({ canvas, userEvent, args }) => {
    await settleViewport(layoutWidths.wide);
    await userEvent.click(canvas.getByText('Approve this plan?'));
    await userEvent.keyboard('{Enter}');
    await expect(args.onAnswer).not.toHaveBeenCalled();
    await expect(args.onPermissionAnswer).not.toHaveBeenCalled();
  },
};

export const FocusedCard: Story = {
  args: { secondCard: true },
  play: async ({ canvas, userEvent, args }) => {
    await settleViewport(layoutWidths.wide);
    await userEvent.click(
      canvas.getByRole('button', { name: 'Keep planning' }),
    );
    await userEvent.type(
      canvas.getByRole('textbox'),
      'Check the empty file too.',
    );
    await userEvent.keyboard('{Enter}');
    await expect(args.onAnswer).toHaveBeenCalledTimes(1);
    await expect(args.onAnswer).toHaveBeenCalledWith({
      planId: shortPlanProposal.planId,
      decision: 'keep_planning',
      feedback: 'Check the empty file too.',
    });
    await expect(args.onPermissionAnswer).not.toHaveBeenCalled();
  },
};
