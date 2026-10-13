import { expect, waitFor, within } from 'storybook/test';
import type { PlanProposalCardProps } from '../../../src/features/requests/components/plan-proposal-card/plan-proposal-card';
import { layoutWidths } from '../../../src/lib/generic/each-layout';
import { settleViewport } from '../../../src/lib/generic/settle-viewport';
import { shortPlanProposal } from '../../plan-proposal-mock';
import {
  answeredElsewhereMessage,
  collapsePlanLabel,
  expandedPlanLabel,
  expandPlanLabel,
  keepPlanningLabel,
  type Story,
} from './plan-proposal-story-context.test.mocks';
import { expandSheet } from './sheet-gestures.test.mocks';

export function answered(
  width: number,
  proposal: PlanProposalCardProps['proposal'] = shortPlanProposal,
): Story {
  return {
    args: {
      proposal,
      state: { kind: 'answered', reason: answeredElsewhereMessage },
    },
    play: async ({ userEvent, args }) => {
      const canvas = within(document.body);
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

      if (width === layoutWidths.phone) {
        await expandSheet(canvas, userEvent);
        await expect(args.onAnswer).not.toHaveBeenCalled();

        return;
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
