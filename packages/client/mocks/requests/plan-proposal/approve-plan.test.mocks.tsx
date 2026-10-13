import { expect, waitFor, within } from 'storybook/test';
import { layoutWidths } from '../../../src/lib/generic/each-layout';
import { settleViewport } from '../../../src/lib/generic/settle-viewport';
import { longPlanProposal, planProposalMocks } from '../../plan-proposal-mock';
import {
  approvePlanQuestion,
  documentLabel,
  expandPlanLabel,
  keepPlanningLabel,
  type Story,
} from './plan-proposal-story-context.test.mocks';

export const shortPlan: Story = {
  play: async ({ userEvent, args }) => {
    const canvas = within(document.body);
    for (const width of [layoutWidths.phone, layoutWidths.wide]) {
      await settleViewport(width);
      if (width === layoutWidths.phone) {
        await expect(
          within(document.body).getByRole('dialog', { name: 'Plan proposal' }),
        ).toBeVisible();
        await expect(canvas.getByText(approvePlanQuestion)).toBeVisible();
        await expect(
          canvas.queryByRole('button', { name: expandPlanLabel }),
        ).not.toBeInTheDocument();
      } else await expect(canvas.getByText(approvePlanQuestion)).toBeVisible();
      await expect(canvas.getByText(/then verify its contents/)).toBeVisible();
      await expect(
        canvas.getByText('hello.txt', { exact: true }),
      ).toBeVisible();
      await expect(
        canvas.getByRole('button', { name: 'Approve' }),
      ).toBeEnabled();
      await expect(
        canvas.getByRole('button', { name: keepPlanningLabel }),
      ).toBeEnabled();
    }
    await userEvent.click(canvas.getByRole('button', { name: 'Approve' }));
    await expect(args.onAnswer).toHaveBeenCalledWith({
      planId: args.proposal.planId,
      decision: 'approve',
    });
    await expect(canvas.getByText(approvePlanQuestion)).toBeVisible();
    await expect(canvas.queryByRole('status')).not.toBeInTheDocument();
  },
};

export function longPlan(width: number): Story {
  return {
    args: { proposal: longPlanProposal },
    play: async ({ userEvent, args }) => {
      const canvas = within(document.body);
      await settleViewport(width);
      const scroll = canvas.getByRole('region', {
        name: documentLabel,
      });
      await waitFor(() =>
        expect(scroll.scrollHeight).toBeGreaterThan(scroll.clientHeight),
      );
      scroll.scrollTop = scroll.scrollHeight;
      await waitFor(() =>
        expect(scroll.scrollTop + scroll.clientHeight).toBeGreaterThanOrEqual(
          scroll.scrollHeight - 1,
        ),
      );
      await expect(
        canvas.getByRole('button', { name: 'Approve' }),
      ).toBeVisible();
      const approve = canvas.getByRole('button', { name: 'Approve' });
      await expect(approve).toBeVisible();
      await waitFor(() =>
        expect(approve.getBoundingClientRect().bottom).toBeLessThanOrEqual(
          window.innerHeight,
        ),
      );
      await userEvent.click(approve);
      await expect(args.onAnswer).toHaveBeenCalledWith({
        planId: args.proposal.planId,
        decision: 'approve',
      });
    },
  };
}

export function open(width: number, index: number): Story {
  const mock = planProposalMocks[index];
  if (!mock) throw new Error('Recorded catalog needs a Plan proposal.');
  return {
    args: { proposal: mock.proposal },
    play: async ({ userEvent, args }) => {
      const canvas = within(document.body);
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
