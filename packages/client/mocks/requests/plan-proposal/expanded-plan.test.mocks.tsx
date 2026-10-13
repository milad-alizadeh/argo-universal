import { expect, waitFor, within } from 'storybook/test';
import { layoutWidths } from '../../../src/lib/generic/each-layout';
import { settleViewport } from '../../../src/lib/generic/settle-viewport';
import { longPlanProposal } from '../../plan-proposal-mock';
import {
  collapsePlanLabel,
  documentLabel,
  expandedPlanLabel,
  expandPlanLabel,
  type Story,
} from './plan-proposal-story-context.test.mocks';
import { checkExpandedSheet } from './sheet-gestures.test.mocks';

export function expanded(width: number): Story {
  return {
    args: { proposal: longPlanProposal },
    play: async ({ userEvent }) => {
      const canvas = within(document.body);
      await settleViewport(width);
      if (width === layoutWidths.phone) {
        await checkExpandedSheet(canvas, userEvent);
        return;
      }
      const collapsedHeight = canvas
        .getByRole('region', { name: documentLabel })
        .getBoundingClientRect().height;
      await userEvent.click(
        canvas.getByRole('button', { name: expandPlanLabel }),
      );
      const dialog = await within(document.body).findByRole('dialog', {
        name: expandedPlanLabel,
      });
      const panel = within(dialog);
      const scroll = panel.getByRole('region', {
        name: documentLabel,
      });
      await waitFor(() =>
        expect(scroll.getBoundingClientRect().height).toBeGreaterThan(
          collapsedHeight,
        ),
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
      scroll.scrollTop = scroll.scrollHeight;
      await waitFor(() => expect(scroll.scrollTop).toBeGreaterThan(0));
      await expect(approve.getBoundingClientRect().top).toBeGreaterThanOrEqual(
        0,
      );
      await expect(approve).toBeVisible();
      await waitFor(() =>
        expect(approve.getBoundingClientRect().bottom).toBeLessThanOrEqual(
          window.innerHeight,
        ),
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
