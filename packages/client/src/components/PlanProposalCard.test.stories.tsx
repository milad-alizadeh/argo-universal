import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor, within } from 'storybook/test';
import {
  longPlanProposal,
  PlanProposalPreview,
  planProposalFeedback,
  planProposalMocks,
  shortPlanProposal,
} from '../../mocks/plan-proposal-mock';
import { settleViewport } from '../../mocks/settle-viewport';
import { PlanProposalCard } from './PlanProposalCard';

const meta = {
  title: 'Tests/PlanProposalCard',
  component: PlanProposalCard,
  parameters: { screenPreview: true, previewPadding: false },
  args: { proposal: shortPlanProposal, onAnswer: fn() },
  render: (args) => <PlanProposalPreview {...args} />,
} satisfies Meta<typeof PlanProposalCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const ShortPlan: Story = {
  play: async ({ canvas, userEvent }) => {
    const { page } = await import('vitest/browser');
    for (const width of [390, 1440]) {
      await page.viewport(width, 844);
      await settleViewport(width);
      await expect(canvas.getByText('Approve this plan?')).toBeVisible();
      await expect(canvas.getByText(/then verify its contents/)).toBeVisible();
      if (width === 390) {
        await expect(
          canvas.queryByText('session', { exact: true }),
        ).not.toBeInTheDocument();
      } else {
        await expect(
          canvas.getByText('session', { exact: true }),
        ).toBeVisible();
      }
      await expect(canvas.getByText('hello.txt', { exact: true })).toHaveStyle({
        fontSize: '14px',
      });
      await expect(
        canvas.getByRole('button', { name: 'Approve' }),
      ).toBeEnabled();
      await expect(
        canvas.getByRole('button', { name: 'Keep planning' }),
      ).toBeEnabled();
    }
    await userEvent.click(canvas.getByRole('button', { name: 'Approve' }));
    await expect(canvas.getByRole('status')).toHaveTextContent('Plan approved');
    await expect(canvas.getByRole('textbox')).toHaveValue('Keep my draft');
    await expect(
      canvas.queryByText('Approve this plan?'),
    ).not.toBeInTheDocument();
  },
};

export const LongPlan: Story = {
  args: { proposal: longPlanProposal },
  play: async ({ canvas }) => {
    const { page } = await import('vitest/browser');
    for (const width of [390, 1440]) {
      await page.viewport(width, 844);
      await settleViewport(width);
      const scroll = canvas.getByTestId('plan-proposal-scroll');
      await waitFor(() => {
        expect(scroll.getBoundingClientRect().height).toBe(280);
        expect(scroll.scrollHeight).toBeGreaterThan(scroll.clientHeight);
      });
      const card = canvas.getByTestId('plan-proposal-card');
      const titleTop =
        canvas.getByText('Approve this plan?').getBoundingClientRect().top -
        card.getBoundingClientRect().top;
      const approve = canvas.getByRole('button', { name: 'Approve' });
      const buttonTop =
        approve.getBoundingClientRect().top - card.getBoundingClientRect().top;
      scroll.scrollTop = scroll.scrollHeight;
      await waitFor(() => expect(scroll.scrollTop).toBeGreaterThan(0));
      await expect(
        canvas.getByText('Approve this plan?').getBoundingClientRect().top -
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

export const KeepPlanning: Story = {
  play: async ({ canvas, userEvent }) => {
    for (const width of [390, 1440]) {
      await settleViewport(width);
      await userEvent.click(
        canvas.getByRole('button', { name: 'Keep planning' }),
      );
      const feedback = canvas.getByRole('textbox', {
        name: 'What should change in the plan?',
      });
      await expect(feedback).toHaveFocus();
      await expect(
        canvas.getByRole('button', { name: 'Keep planning' }),
      ).toBeDisabled();
      await userEvent.type(feedback, '   ');
      await expect(
        canvas.getByRole('button', { name: 'Keep planning' }),
      ).toBeDisabled();
      if (width === 1440) await userEvent.keyboard('{Escape}');
      else await userEvent.click(canvas.getByRole('button', { name: 'Back' }));
      await expect(canvas.queryByRole('textbox')).not.toBeInTheDocument();
      await expect(
        canvas.getByRole('button', { name: 'Approve' }),
      ).toBeEnabled();
    }
  },
};

export const KeepPlanningWithFeedback: Story = {
  play: async ({ canvas, userEvent, args }) => {
    for (const width of [390, 1440]) {
      await settleViewport(width);
      await userEvent.click(
        canvas.getByRole('button', { name: 'Keep planning' }),
      );
      const feedback = canvas.getByRole('textbox', {
        name: 'What should change in the plan?',
      });
      await userEvent.clear(feedback);
      await userEvent.type(feedback, planProposalFeedback);
      await expect(
        canvas.getByRole('button', { name: 'Keep planning' }),
      ).toBeEnabled();
      if (width === 390) {
        await userEvent.click(canvas.getByRole('button', { name: 'Back' }));
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
    }
  },
};

export const Expanded: Story = {
  args: { proposal: longPlanProposal },
  play: async ({ canvas, userEvent }) => {
    for (const width of [390, 1440]) {
      await settleViewport(width);
      await userEvent.click(
        canvas.getByRole('button', { name: 'Expand plan' }),
      );
      const dialog = await within(document.body).findByRole('dialog', {
        name: 'Expanded plan',
      });
      const panel = within(dialog);
      const scroll = panel.getByTestId('plan-proposal-scroll');
      await waitFor(() =>
        expect(scroll.getBoundingClientRect().height).toBeGreaterThan(280),
      );
      if (width === 1440) {
        const main = canvas
          .getByTestId('plan-proposal-main-content')
          .getBoundingClientRect();
        const expanded = dialog.getBoundingClientRect();
        await expect(expanded.left).toBeGreaterThanOrEqual(main.left);
        await expect(expanded.right).toBeLessThanOrEqual(main.right);
        await expect(expanded.top).toBeGreaterThanOrEqual(main.top);
        await expect(expanded.bottom).toBeLessThanOrEqual(main.bottom);
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
        panel.getByRole('button', { name: 'Collapse plan' }),
      );
      await waitFor(() =>
        expect(
          within(document.body).queryByRole('dialog', {
            name: 'Expanded plan',
          }),
        ).not.toBeInTheDocument(),
      );
      await expect(
        canvas.getByRole('button', { name: 'Expand plan' }),
      ).toBeVisible();
    }
  },
};

export const Answered: Story = {
  args: { answered: true },
  play: async ({ canvas, userEvent, args }) => {
    for (const width of [390, 1440]) {
      await settleViewport(width);
      await expect(
        canvas.getByText('Already answered on another device'),
      ).toBeVisible();
      if (width === 390) {
        await expect(
          canvas.queryByRole('button', { name: 'Approve' }),
        ).not.toBeInTheDocument();
        await expect(
          canvas.queryByRole('button', { name: 'Keep planning' }),
        ).not.toBeInTheDocument();
      } else {
        await expect(
          canvas.getByRole('button', { name: 'Approve' }),
        ).toBeDisabled();
        await expect(
          canvas.getByRole('button', { name: 'Keep planning' }),
        ).toBeDisabled();
      }
      await userEvent.click(
        canvas.getByRole('button', { name: 'Expand plan' }),
      );
      const dialog = await within(document.body).findByRole('dialog', {
        name: 'Expanded plan',
      });
      await expect(
        within(dialog).getByText('Already answered on another device'),
      ).toBeVisible();
      await userEvent.click(
        within(dialog).getByRole('button', { name: 'Collapse plan' }),
      );
    }
    await expect(args.onAnswer).not.toHaveBeenCalled();
  },
};

export const ShortPlanDark: Story = { ...ShortPlan, globals: { mode: 'dark' } };
export const LongPlanDark: Story = { ...LongPlan, globals: { mode: 'dark' } };
export const ExpandedDark: Story = { ...Expanded, globals: { mode: 'dark' } };
export const KeepPlanningDark: Story = {
  ...KeepPlanning,
  globals: { mode: 'dark' },
};
export const KeepPlanningWithFeedbackDark: Story = {
  ...KeepPlanningWithFeedback,
  globals: { mode: 'dark' },
};
export const AnsweredDark: Story = { ...Answered, globals: { mode: 'dark' } };

function recordedAnswer(index: number): Story {
  const mock = planProposalMocks[index];
  if (!mock) throw new Error('Plan proposal recording is missing.');
  return {
    args: { proposal: mock.proposal },
    play: async ({ canvas, userEvent, args }) => {
      await settleViewport(index % 2 ? 1440 : 390);
      await expect(canvas.getByText('Approve this plan?')).toBeVisible();
      if (mock.answer.decision === 'keep_planning') {
        await userEvent.click(
          canvas.getByRole('button', { name: 'Keep planning' }),
        );
        await userEvent.type(canvas.getByRole('textbox'), mock.answer.feedback);
        await userEvent.click(
          canvas.getByRole('button', { name: 'Keep planning' }),
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

export const ExpandWhilePlanning: Story = {
  play: async ({ canvas, userEvent }) => {
    for (const width of [390, 1440]) {
      await settleViewport(width);
      await userEvent.click(
        canvas.getByRole('button', { name: 'Keep planning' }),
      );
      await userEvent.clear(canvas.getByRole('textbox'));
      await userEvent.type(canvas.getByRole('textbox'), 'Keep this feedback');
      await userEvent.click(
        canvas.getByRole('button', { name: 'Expand plan' }),
      );
      const dialog = await within(document.body).findByRole('dialog', {
        name: 'Expanded plan',
      });
      await expect(within(dialog).getByRole('textbox')).toHaveValue(
        'Keep this feedback',
      );
      await userEvent.click(
        within(dialog).getByRole('button', { name: 'Collapse plan' }),
      );
      await expect(canvas.getByRole('textbox')).toHaveValue(
        'Keep this feedback',
      );
      await expect(
        canvas.getByRole('button', { name: 'Expand plan' }),
      ).toBeVisible();
      await userEvent.click(canvas.getByRole('button', { name: 'Back' }));
      await userEvent.click(
        canvas.getByRole('button', { name: 'Expand plan' }),
      );
      await within(document.body).findByRole('dialog', {
        name: 'Expanded plan',
      });
      await userEvent.keyboard('{Escape}');
      await waitFor(() =>
        expect(
          within(document.body).queryByRole('dialog', {
            name: 'Expanded plan',
          }),
        ).not.toBeInTheDocument(),
      );
    }
  },
};
