import type { SessionAnswerPlanProposalInput } from '@repo/contracts';
import { expect, within } from 'storybook/test';
import type { PlanProposalAnswer } from '../../../src/features/requests/components/plan-proposal-card/plan-proposal-card';
import { layoutWidths } from '../../../src/lib/generic/each-layout';
import { settleViewport } from '../../../src/lib/generic/settle-viewport';
import { planProposalMocks } from '../../plan-proposal-mock';
import {
  keepPlanningLabel,
  type Story,
} from './plan-proposal-story-context.test.mocks';

export function recordedAnswer(index: number): Story {
  const mock = planProposalMocks[index];

  if (!mock) throw new Error('Plan proposal recording is missing.');

  return {
    args: { proposal: mock.proposal },
    play: async ({ userEvent, args }) => {
      const canvas = within(document.body);
      await settleViewport(index % 2 ? layoutWidths.wide : layoutWidths.phone);
      await expect(
        canvas.getByRole('button', { name: 'Approve' }),
      ).toBeVisible();

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
      await expect(args.onAnswer).toHaveBeenCalledWith(
        withoutSession(mock.answer),
      );
    },
  };
}

// The card answers for its Session, so its answer carries every recorded field but the Session's.
function withoutSession({
  sessionId: _sessionId,
  ...answer
}: SessionAnswerPlanProposalInput): PlanProposalAnswer {
  return answer;
}
