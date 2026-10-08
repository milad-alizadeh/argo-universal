import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, within } from 'storybook/test';
import { layoutWidths } from '../../mocks/each-layout';
import { PlanProposalAnswerPreview } from '../../mocks/plan-proposal-lifecycle-mock';
import {
  PlanProposalPreview,
  planProposalMocks,
  shortPlanProposal,
} from '../../mocks/plan-proposal-mock';
import { settleViewport } from '../../mocks/settle-viewport';
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
  render: (args): ReturnType<typeof PlanProposalPreview> => (
    <PlanProposalPreview {...args} />
  ),
} satisfies Meta<typeof PlanProposalCard>;
export default meta;
type Story = StoryObj<typeof meta>;

const needsProposal = 'Recorded catalog needs a Plan proposal.';
const keepPlanningLabel = 'Keep planning';
const sendingLabel = 'Sending…';
const feedbackLabel = 'What should change in the plan?';
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

function feedbackPending(width: number, index: number): Story {
  const mock = planProposalMocks[index];
  if (!mock) throw new Error(needsProposal);
  return {
    args: { proposal: mock.proposal },
    render: (args): ReturnType<typeof PlanProposalPreview> => (
      <PlanProposalAnswerPreview {...args} />
    ),
    play: async ({ canvas, userEvent, args }) => {
      await settleViewport(width);
      await userEvent.click(
        canvas.getByRole('button', { name: keepPlanningLabel }),
      );
      const feedback = canvas.getByRole('textbox', {
        name: feedbackLabel,
      });
      await userEvent.type(feedback, 'Keep this feedback');
      await userEvent.click(
        canvas.getByRole('button', { name: keepPlanningLabel }),
      );
      const sending = canvas.getByRole('button', { name: sendingLabel });
      await expect(within(sending).getByRole('status')).toHaveTextContent(
        sendingLabel,
      );
      await expect(feedback).toHaveValue('Keep this feedback');
      await expect(feedback).toHaveAttribute('readonly');
      await expect(canvas.getByRole('button', { name: 'Back' })).toBeDisabled();
      await userEvent.keyboard('{Enter}');
      await expect(args.onAnswer).toHaveBeenCalledTimes(1);
    },
  };
}
export const FirstAgentFeedbackPendingPhone = feedbackPending(
  layoutWidths.phone,
  0,
);
export const FirstAgentFeedbackPendingWide = feedbackPending(
  layoutWidths.wide,
  0,
);
export const SecondAgentFeedbackPendingPhone = feedbackPending(
  layoutWidths.phone,
  2,
);
export const SecondAgentFeedbackPendingWide = feedbackPending(
  layoutWidths.wide,
  2,
);
