import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { layoutWidths } from '../../../../mocks/each-layout';
import {
  planProposalMocks,
  shortPlanProposal,
} from '../../../../mocks/plan-proposal-mock';
import { settleViewport } from '../../../../mocks/settle-viewport';
import { PlanProposalCard } from './plan-proposal-card';

const meta = {
  title: 'Tests/PlanProposalCardLifecycle',
  component: PlanProposalCard,
  parameters: { screenPreview: true, previewPadding: false },
  args: {
    proposal: shortPlanProposal,
    onAnswer: fn(),
    state: { kind: 'open' },
  },
} satisfies Meta<typeof PlanProposalCard>;
export default meta;
type Story = StoryObj<typeof meta>;

const needsProposal = 'Recorded catalog needs a Plan proposal.';
const keepPlanningLabel = 'Keep planning';
const sendingLabel = 'Sending…';
function submitting(width: number, index: number): Story {
  const mock = planProposalMocks[index];
  if (!mock) throw new Error(needsProposal);
  return {
    args: { proposal: mock.proposal, state: { kind: 'submitting' } },
    play: async ({ canvas, userEvent, args }) => {
      await settleViewport(width);
      await expect(canvas.getByRole('status')).toHaveTextContent(sendingLabel);
      await expect(
        canvas.getByRole('button', { name: sendingLabel }),
      ).toBeDisabled();
      await expect(
        canvas.getByRole('button', { name: keepPlanningLabel }),
      ).toBeDisabled();
      await expect(canvas.queryByRole('alert')).not.toBeInTheDocument();
      await expect(canvas.getByText('Approve this plan?')).toBeVisible();
      await userEvent.keyboard('{Enter}');
      await expect(args.onAnswer).not.toHaveBeenCalled();
    },
  };
}

export const FirstAgentSubmittingPhone = submitting(layoutWidths.phone, 0);
export const FirstAgentSubmittingWide = submitting(layoutWidths.wide, 0);
export const SecondAgentSubmittingPhone = submitting(layoutWidths.phone, 2);
export const SecondAgentSubmittingWide = submitting(layoutWidths.wide, 2);

const answerError = 'Could not send your answer. Try again.';

function failedAnswer(width: number, index: number): Story {
  const mock = planProposalMocks[index];
  if (!mock) throw new Error(needsProposal);
  return {
    args: { proposal: mock.proposal, error: answerError },
    play: async ({ canvas, userEvent, args }) => {
      await settleViewport(width);
      await expect(canvas.getByRole('alert')).toHaveTextContent(answerError);
      await expect(canvas.queryByRole('status')).not.toBeInTheDocument();
      await expect(
        canvas.getByRole('button', { name: 'Approve' }),
      ).toBeEnabled();
      await expect(
        canvas.getByRole('button', { name: keepPlanningLabel }),
      ).toBeEnabled();
      await userEvent.click(canvas.getByRole('button', { name: 'Approve' }));
      await expect(args.onAnswer).toHaveBeenCalledWith({
        planId: mock.proposal.planId,
        decision: 'approve',
      });
    },
  };
}

export const FirstAgentErrorPhone = failedAnswer(layoutWidths.phone, 0);
export const FirstAgentErrorWide = failedAnswer(layoutWidths.wide, 0);
export const SecondAgentErrorPhone = failedAnswer(layoutWidths.phone, 2);
export const SecondAgentErrorWide = failedAnswer(layoutWidths.wide, 2);
