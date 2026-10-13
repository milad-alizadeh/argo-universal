import { expect, waitFor, within } from 'storybook/test';
import { layoutWidths } from '../../../src/lib/generic/each-layout';
import { settleViewport } from '../../../src/lib/generic/settle-viewport';
import {
  collapsePlanLabel,
  expandedPlanLabel,
  expandPlanLabel,
  feedbackDraft,
  keepPlanningLabel,
  type Story,
} from './plan-proposal-story-context.test.mocks';
import { expandSheet } from './sheet-gestures.test.mocks';

export function expandWhilePlanning(width: number): Story {
  return {
    play: async ({ userEvent }) => {
      const canvas = within(document.body);
      await settleViewport(width);
      await userEvent.click(
        canvas.getByRole('button', { name: keepPlanningLabel }),
      );
      await userEvent.type(canvas.getByRole('textbox'), feedbackDraft);

      if (width === layoutWidths.phone) {
        await expandSheet(canvas, userEvent);
        await expect(canvas.getByRole('textbox')).toHaveValue(feedbackDraft);

        return;
      }

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
      await (width === layoutWidths.wide
        ? userEvent.keyboard('{Escape}')
        : userEvent.click(
            within(document.body).getByRole('button', {
              name: collapsePlanLabel,
            }),
          ));
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
