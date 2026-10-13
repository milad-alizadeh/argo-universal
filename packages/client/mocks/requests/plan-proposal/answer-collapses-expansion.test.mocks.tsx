import type * as React from 'react';
import { expect, waitFor, within } from 'storybook/test';
import { layoutWidths } from '../../../src/lib/generic/each-layout';
import { settleViewport } from '../../../src/lib/generic/settle-viewport';
import {
  longPlanProposal,
  PlanProposalPreview,
  planProposalFeedback,
} from '../../plan-proposal-mock';
import {
  approvePlanQuestion,
  type Canvas,
  documentLabel,
  expandedPlanLabel,
  expandPlanLabel,
  keepPlanningLabel,
  type PlayContext,
  type Story,
} from './plan-proposal-story-context.test.mocks';
import { expandSheet } from './sheet-gestures.test.mocks';

export function answerCollapsesExpansion(width: number): Story {
  return {
    args: { proposal: longPlanProposal },
    render: (args): React.JSX.Element => <PlanProposalPreview {...args} />,
    play: async ({ userEvent, args }) => {
      const canvas = within(document.body);
      await settleViewport(width);

      if (width === layoutWidths.phone) {
        await expandSheet(canvas, userEvent);
        await userEvent.click(canvas.getByRole('button', { name: 'Approve' }));
        await expect(args.onAnswer).toHaveBeenCalledWith({
          planId: args.proposal.planId,
          decision: 'approve',
        });

        return;
      }

      for (const decision of ['approve', 'keep_planning'])
        await answerInExpansion({ canvas, userEvent, decision });
      await expect(canvas.getByRole('textbox')).toHaveValue(
        planProposalFeedback,
      );
      await expect(args.onAnswer).toHaveBeenCalledTimes(2);
    },
  };
}

async function answerInExpansion({
  canvas,
  userEvent,
  decision,
}: {
  canvas: Canvas;
  userEvent: PlayContext['userEvent'];
  decision: string;
}): Promise<void> {
  const overlay = within(document.body);
  await userEvent.click(canvas.getByRole('button', { name: expandPlanLabel }));

  const dialog = await overlay.findByRole('dialog', {
    name: expandedPlanLabel,
  });

  const panel = within(dialog);

  if (decision === 'keep_planning') {
    await userEvent.click(
      panel.getByRole('button', { name: keepPlanningLabel }),
    );
    await userEvent.type(panel.getByRole('textbox'), planProposalFeedback);
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
    canvas.getByRole('region', { name: documentLabel }),
  ).toBeVisible();
}
