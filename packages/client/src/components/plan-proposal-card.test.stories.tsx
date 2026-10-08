import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { expect, fn, waitFor, within } from 'storybook/test';
import { layoutWidths } from '../../mocks/each-layout';
import {
  longPlanProposal,
  PlanProposalPreview,
  planProposalFeedback,
  planProposalMocks,
  shortPlanProposal,
} from '../../mocks/plan-proposal-mock';
import { settleViewport } from '../../mocks/settle-viewport';
import {
  PlanProposalCard,
  type PlanProposalCardProps,
} from './plan-proposal-card';

const approvePlanQuestion = 'Approve this plan?';
const keepPlanningLabel = 'Keep planning';
const planScrollId = 'plan-proposal-scroll';
const expandPlanLabel = 'Expand plan';
const expandedPlanLabel = 'Expanded plan';
const collapsePlanLabel = 'Collapse plan';
const answeredElsewhereMessage = 'Already answered on another device';
const feedbackDraft = 'Keep this feedback';

const meta = {
  title: 'Tests/PlanProposalCard',
  component: PlanProposalCard,
  parameters: { screenPreview: true, previewPadding: false },
  args: {
    proposal: shortPlanProposal,
    onAnswer: fn(),
    state: { kind: 'open' },
  },
  render: (args): React.JSX.Element => <PlanProposalPreview {...args} />,
} satisfies Meta<typeof PlanProposalCard>;
export default meta;
type Story = StoryObj<typeof meta>;

const dark = { globals: { mode: 'dark' } };

export const ShortPlan: Story = {
  play: async ({ canvas, userEvent }) => {
    for (const width of [layoutWidths.phone, layoutWidths.wide]) {
      await settleViewport(width);
      await expect(canvas.getByText(approvePlanQuestion)).toBeVisible();
      await expect(canvas.getByText(/then verify its contents/)).toBeVisible();
      await waitFor(() => {
        if (width === layoutWidths.phone) {
          expect(
            canvas.queryByText('session', { exact: true }),
          ).not.toBeInTheDocument();
        } else {
          expect(canvas.getByText('session', { exact: true })).toBeVisible();
        }
      });
      await expect(canvas.getByText('hello.txt', { exact: true })).toHaveStyle({
        fontSize: '14px',
      });
      await expect(
        canvas.getByRole('button', { name: 'Approve' }),
      ).toBeEnabled();
      await expect(
        canvas.getByRole('button', { name: keepPlanningLabel }),
      ).toBeEnabled();
    }
    await userEvent.click(canvas.getByRole('button', { name: 'Approve' }));
    await expect(canvas.getByRole('status')).toHaveTextContent('Plan approved');
    await expect(canvas.getByRole('textbox')).toHaveValue('Keep my draft');
    await expect(
      canvas.queryByText(approvePlanQuestion),
    ).not.toBeInTheDocument();
  },
};

export const LongPlan: Story = {
  args: { proposal: longPlanProposal },
  play: async ({ canvas }) => {
    for (const width of [layoutWidths.phone, layoutWidths.wide]) {
      await settleViewport(width);
      const scroll = canvas.getByTestId(planScrollId);
      await waitFor(() => {
        expect(scroll.getBoundingClientRect().height).toBe(280);
        expect(scroll.scrollHeight).toBeGreaterThan(scroll.clientHeight);
      });
      const card = canvas.getByTestId('plan-proposal-card');
      const titleTop =
        canvas.getByText(approvePlanQuestion).getBoundingClientRect().top -
        card.getBoundingClientRect().top;
      const approve = canvas.getByRole('button', { name: 'Approve' });
      const buttonTop =
        approve.getBoundingClientRect().top - card.getBoundingClientRect().top;
      scroll.scrollTop = scroll.scrollHeight;
      await waitFor(() => expect(scroll.scrollTop).toBeGreaterThan(0));
      await expect(
        canvas.getByText(approvePlanQuestion).getBoundingClientRect().top -
          card.getBoundingClientRect().top,
      ).toBe(titleTop);
      await expect(
        approve.getBoundingClientRect().top - card.getBoundingClientRect().top,
      ).toBe(buttonTop);
      await expect(approve).toBeVisible();
      await expect(approve.getBoundingClientRect().bottom).toBeLessThanOrEqual(
        window.innerHeight,
      );
      scroll.scrollTop = 0;
    }
  },
};

function keepPlanning(width: number): Story {
  return {
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      await userEvent.click(
        canvas.getByRole('button', { name: keepPlanningLabel }),
      );
      const feedback = canvas.getByRole('textbox', {
        name: 'What should change in the plan?',
      });
      await expect(feedback).toHaveFocus();
      await expect(
        canvas.getByRole('button', { name: keepPlanningLabel }),
      ).toBeDisabled();
      await userEvent.type(feedback, '   ');
      await expect(
        canvas.getByRole('button', { name: keepPlanningLabel }),
      ).toBeDisabled();
      if (width === layoutWidths.wide) await userEvent.keyboard('{Escape}');
      else await userEvent.click(canvas.getByRole('button', { name: 'Back' }));
      await expect(canvas.queryByRole('textbox')).not.toBeInTheDocument();
      await expect(
        canvas.getByRole('button', { name: 'Approve' }),
      ).toBeEnabled();
    },
  };
}
export const KeepPlanningPhone = keepPlanning(layoutWidths.phone);
export const KeepPlanningWide = keepPlanning(layoutWidths.wide);

function keepPlanningWithFeedback(width: number): Story {
  return {
    play: async ({ canvas, userEvent, args }) => {
      await settleViewport(width);
      await userEvent.click(
        canvas.getByRole('button', { name: keepPlanningLabel }),
      );
      const feedback = canvas.getByRole('textbox', {
        name: 'What should change in the plan?',
      });
      await userEvent.type(feedback, planProposalFeedback);
      await expect(
        canvas.getByRole('button', { name: keepPlanningLabel }),
      ).toBeEnabled();
      if (width === layoutWidths.phone) {
        await userEvent.click(canvas.getByRole('button', { name: 'Back' }));
        await expect(args.onAnswer).not.toHaveBeenCalled();
      } else {
        await userEvent.keyboard('{Enter}');
        await expect(canvas.getByRole('status')).toHaveTextContent(
          `You kept planning: ${planProposalFeedback}`,
        );
        await expect(args.onAnswer).toHaveBeenCalledWith({
          planId: args.proposal.planId,
          decision: 'keep_planning',
          feedback: planProposalFeedback,
        });
      }
    },
  };
}
export const KeepPlanningWithFeedbackPhone = keepPlanningWithFeedback(
  layoutWidths.phone,
);
export const KeepPlanningWithFeedbackWide = keepPlanningWithFeedback(
  layoutWidths.wide,
);

function expanded(width: number): Story {
  return {
    args: { proposal: longPlanProposal },
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      await userEvent.click(
        canvas.getByRole('button', { name: expandPlanLabel }),
      );
      const dialog = await within(document.body).findByRole('dialog', {
        name: expandedPlanLabel,
      });
      const panel = within(dialog);
      const scroll = panel.getByTestId(planScrollId);
      await waitFor(() =>
        expect(scroll.getBoundingClientRect().height).toBeGreaterThan(280),
      );
      if (width === layoutWidths.wide) {
        const main = canvas
          .getByTestId('plan-proposal-main-content')
          .getBoundingClientRect();
        const expandedBounds = dialog.getBoundingClientRect();
        await expect(expandedBounds.left).toBeGreaterThanOrEqual(main.left);
        await expect(expandedBounds.right).toBeLessThanOrEqual(main.right);
        await expect(expandedBounds.top).toBeGreaterThanOrEqual(main.top);
        await expect(expandedBounds.bottom).toBeLessThanOrEqual(main.bottom);
      }
      const approve = panel.getByRole('button', { name: 'Approve' });
      const top = approve.getBoundingClientRect().top;
      scroll.scrollTop = scroll.scrollHeight;
      await waitFor(() => expect(scroll.scrollTop).toBeGreaterThan(0));
      await expect(approve.getBoundingClientRect().top).toBe(top);
      await expect(approve).toBeVisible();
      await expect(approve.getBoundingClientRect().bottom).toBeLessThanOrEqual(
        window.innerHeight,
      );
      await userEvent.click(
        panel.getByRole('button', { name: collapsePlanLabel }),
      );
      await waitFor(() =>
        expect(
          within(document.body).queryByRole('dialog', {
            name: expandedPlanLabel,
          }),
        ).not.toBeInTheDocument(),
      );
      await expect(
        canvas.getByRole('button', { name: expandPlanLabel }),
      ).toBeVisible();
    },
  };
}
export const ExpandedPhone = expanded(layoutWidths.phone);
export const ExpandedWide = expanded(layoutWidths.wide);

function answered(
  width: number,
  proposal: PlanProposalCardProps['proposal'] = shortPlanProposal,
): Story {
  return {
    args: {
      proposal,
      state: { kind: 'answered', reason: answeredElsewhereMessage },
    },
    play: async ({ canvas, userEvent, args }) => {
      await settleViewport(width);
      await expect(canvas.getByRole('status')).toHaveTextContent(
        answeredElsewhereMessage,
      );
      await expect(canvas.queryByRole('alert')).not.toBeInTheDocument();
      // A loaded runner can draw the default viewport's card for a few frames after the resize.
      if (width === layoutWidths.phone) {
        await waitFor(() =>
          expect(
            canvas.queryByRole('button', { name: 'Approve' }),
          ).not.toBeInTheDocument(),
        );
        await expect(
          canvas.queryByRole('button', { name: keepPlanningLabel }),
        ).not.toBeInTheDocument();
      } else {
        await expect(
          canvas.getByRole('button', { name: 'Approve' }),
        ).toBeDisabled();
        await expect(
          canvas.getByRole('button', { name: keepPlanningLabel }),
        ).toBeDisabled();
      }
      await userEvent.click(
        canvas.getByRole('button', { name: expandPlanLabel }),
      );
      const dialog = await within(document.body).findByRole('dialog', {
        name: expandedPlanLabel,
      });
      await expect(
        within(dialog).getByText(answeredElsewhereMessage),
      ).toBeVisible();
      await userEvent.click(
        within(dialog).getByRole('button', { name: collapsePlanLabel }),
      );
      await expect(args.onAnswer).not.toHaveBeenCalled();
    },
  };
}
export const AnsweredPhone = answered(layoutWidths.phone);
export const AnsweredWide = answered(layoutWidths.wide);
export const FirstAgentAnsweredPhone = answered(
  layoutWidths.phone,
  planProposalMocks[0]?.proposal,
);
export const FirstAgentAnsweredWide = answered(
  layoutWidths.wide,
  planProposalMocks[0]?.proposal,
);

function open(width: number, index: number): Story {
  const mock = planProposalMocks[index];
  if (!mock) throw new Error('Recorded catalog needs a Plan proposal.');
  return {
    args: { proposal: mock.proposal },
    play: async ({ canvas, userEvent, args }) => {
      await settleViewport(width);
      await expect(canvas.queryByRole('status')).not.toBeInTheDocument();
      await expect(canvas.queryByRole('alert')).not.toBeInTheDocument();
      await userEvent.click(canvas.getByRole('button', { name: 'Approve' }));
      await expect(args.onAnswer).toHaveBeenCalledWith({
        planId: mock.proposal.planId,
        decision: 'approve',
      });
    },
  };
}
export const FirstAgentOpenPhone = open(layoutWidths.phone, 0);
export const FirstAgentOpenWide = open(layoutWidths.wide, 0);
export const SecondAgentOpenPhone = open(layoutWidths.phone, 2);
export const SecondAgentOpenWide = open(layoutWidths.wide, 2);

function answerCollapsesExpansion(width: number): Story {
  return {
    args: { proposal: longPlanProposal },
    render: (args) => (
      <PlanProposalPreview {...args} retainProposalAfterAnswer />
    ),
    play: async ({ canvas, userEvent, args }) => {
      const overlay = within(document.body);
      await settleViewport(width);
      for (const decision of ['approve', 'keep_planning']) {
        await userEvent.click(
          canvas.getByRole('button', { name: expandPlanLabel }),
        );
        const dialog = await overlay.findByRole('dialog', {
          name: expandedPlanLabel,
        });
        const panel = within(dialog);
        if (decision === 'keep_planning') {
          await userEvent.click(
            panel.getByRole('button', { name: keepPlanningLabel }),
          );
          await userEvent.type(
            panel.getByRole('textbox'),
            planProposalFeedback,
          );
        }
        await userEvent.click(
          panel.getByRole('button', {
            name: decision === 'approve' ? 'Approve' : keepPlanningLabel,
          }),
        );
        await waitFor(() =>
          expect(
            overlay.queryByRole('dialog', { name: expandedPlanLabel }),
          ).not.toBeInTheDocument(),
        );
        await expect(canvas.getByText(approvePlanQuestion)).toBeVisible();
        await expect(
          canvas.getByTestId(planScrollId).getBoundingClientRect().height,
        ).toBe(280);
      }
      await expect(canvas.getByRole('textbox')).toHaveValue(
        planProposalFeedback,
      );
      await expect(args.onAnswer).toHaveBeenCalledTimes(2);
    },
  };
}
export const AnswerCollapsesExpansionPhone = answerCollapsesExpansion(
  layoutWidths.phone,
);
export const AnswerCollapsesExpansionWide = answerCollapsesExpansion(
  layoutWidths.wide,
);

export const ShortPlanDark: Story = { ...ShortPlan, ...dark };
export const LongPlanDark: Story = { ...LongPlan, ...dark };
export const ExpandedPhoneDark: Story = { ...ExpandedPhone, ...dark };
export const ExpandedWideDark: Story = { ...ExpandedWide, ...dark };
export const KeepPlanningPhoneDark: Story = { ...KeepPlanningPhone, ...dark };
export const KeepPlanningWideDark: Story = { ...KeepPlanningWide, ...dark };
export const KeepPlanningWithFeedbackPhoneDark: Story = {
  ...KeepPlanningWithFeedbackPhone,
  ...dark,
};
export const KeepPlanningWithFeedbackWideDark: Story = {
  ...KeepPlanningWithFeedbackWide,
  ...dark,
};
export const AnsweredPhoneDark: Story = { ...AnsweredPhone, ...dark };
export const AnsweredWideDark: Story = { ...AnsweredWide, ...dark };

function recordedAnswer(index: number): Story {
  const mock = planProposalMocks[index];
  if (!mock) throw new Error('Plan proposal recording is missing.');
  return {
    args: { proposal: mock.proposal },
    play: async ({ canvas, userEvent, args }) => {
      await settleViewport(index % 2 ? layoutWidths.wide : layoutWidths.phone);
      await expect(canvas.getByText(approvePlanQuestion)).toBeVisible();
      if (mock.answer.decision === 'keep_planning') {
        await userEvent.click(
          canvas.getByRole('button', { name: keepPlanningLabel }),
        );
        await userEvent.type(canvas.getByRole('textbox'), mock.answer.feedback);
        await userEvent.click(
          canvas.getByRole('button', { name: keepPlanningLabel }),
        );
      } else
        await userEvent.click(canvas.getByRole('button', { name: 'Approve' }));
      const { sessionId: _, ...answer } = mock.answer;
      await expect(args.onAnswer).toHaveBeenCalledWith(answer);
      await expect(canvas.getByRole('textbox')).toHaveValue('Keep my draft');
    },
  };
}

export const FirstRecordedAnswer: Story = recordedAnswer(0);
export const SecondRecordedAnswer: Story = recordedAnswer(1);
export const ThirdRecordedAnswer: Story = recordedAnswer(2);
export const FourthRecordedAnswer: Story = recordedAnswer(3);

function expandWhilePlanning(width: number): Story {
  return {
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      await userEvent.click(
        canvas.getByRole('button', { name: keepPlanningLabel }),
      );
      await userEvent.type(canvas.getByRole('textbox'), feedbackDraft);
      await userEvent.click(
        canvas.getByRole('button', { name: expandPlanLabel }),
      );
      const dialog = await within(document.body).findByRole('dialog', {
        name: expandedPlanLabel,
      });
      await expect(within(dialog).getByRole('textbox')).toHaveValue(
        feedbackDraft,
      );
      await userEvent.click(
        within(dialog).getByRole('button', { name: collapsePlanLabel }),
      );
      await expect(canvas.getByRole('textbox')).toHaveValue(feedbackDraft);
      await expect(
        canvas.getByRole('button', { name: expandPlanLabel }),
      ).toBeVisible();
      await userEvent.click(canvas.getByRole('button', { name: 'Back' }));
      await userEvent.click(
        canvas.getByRole('button', { name: expandPlanLabel }),
      );
      await within(document.body).findByRole('dialog', {
        name: expandedPlanLabel,
      });
      if (width === layoutWidths.wide) await userEvent.keyboard('{Escape}');
      else
        await userEvent.click(
          within(document.body).getByRole('button', {
            name: collapsePlanLabel,
          }),
        );
      await waitFor(() =>
        expect(
          within(document.body).queryByRole('dialog', {
            name: expandedPlanLabel,
          }),
        ).not.toBeInTheDocument(),
      );
    },
  };
}
export const ExpandWhilePlanningPhone = expandWhilePlanning(layoutWidths.phone);
export const ExpandWhilePlanningWide = expandWhilePlanning(layoutWidths.wide);
