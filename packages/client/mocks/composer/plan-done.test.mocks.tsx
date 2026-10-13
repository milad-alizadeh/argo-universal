import { waitFor, expect, within } from 'storybook/test';
import { Composer } from '../../src/features/composer/components/composer/composer';
import { settleViewport } from '../../src/lib/generic/settle-viewport';
import { composerProps, composerPlanDone } from '../composer-mock';
import { type Story } from './composer-story-context.test.mocks';
import { planTitle } from './composer-test-contract.test.mocks';
export function planDone(width: number): Story {
  return {
    render: (args) => (
      <Composer
        {...composerProps({
          ...args,
          sessionStarted: true,
          plan: composerPlanDone,
        })}
      />
    ),
    play: async ({ canvas, userEvent }) => {
      const overlay = within(document.body);
      await settleViewport(width);
      const plan = canvas.getByRole('button', { name: 'Plan' });
      await expect(plan).toBeVisible();
      if (width >= 1100) {
        await expect(plan).toHaveTextContent('Plan 3/3');
        await userEvent.click(plan);
        await waitFor(() => expect(canvas.getByText(planTitle)).toBeVisible());
      } else {
        await userEvent.click(plan);
        await waitFor(() => expect(overlay.getByText(planTitle)).toBeVisible());
        const sheet = within(overlay.getByRole('dialog', { name: 'Plan' }));
        await expect(
          sheet.getAllByRole('heading', { name: 'Plan' }),
        ).toHaveLength(1);
        await expect(sheet.queryByText('3 of 3 done')).not.toBeInTheDocument();
        await expect(sheet.queryByRole('progressbar')).not.toBeInTheDocument();
      }
      await expect(
        overlay.queryByRole('progressbar', { name: /in progress$/ }),
      ).not.toBeInTheDocument();
    },
  };
}
