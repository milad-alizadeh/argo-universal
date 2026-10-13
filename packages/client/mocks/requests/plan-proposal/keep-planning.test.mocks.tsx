import { expect, within } from 'storybook/test';
import { layoutWidths } from '../../../src/lib/generic/each-layout';
import { settleViewport } from '../../../src/lib/generic/settle-viewport';
import { planProposalFeedback } from '../../plan-proposal-mock';
import {
  keepPlanningLabel,
  type Story,
} from './plan-proposal-story-context.test.mocks';

export function keepPlanning(width: number): Story {
  return {
    play: async ({ userEvent }) => {
      const canvas = within(document.body);
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
      await (width === layoutWidths.wide
        ? userEvent.keyboard('{Escape}')
        : userEvent.click(canvas.getByRole('button', { name: 'Back' })));
      await expect(canvas.queryByRole('textbox')).not.toBeInTheDocument();
      await expect(
        canvas.getByRole('button', { name: 'Approve' }),
      ).toBeEnabled();
    },
  };
}

export function keepPlanningWithFeedback(width: number): Story {
  return {
    play: async ({ userEvent, args }) => {
      const canvas = within(document.body);
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
        await expect(args.onAnswer).toHaveBeenCalledWith({
          planId: args.proposal.planId,
          decision: 'keep_planning',
          feedback: planProposalFeedback,
        });
      }
    },
  };
}
