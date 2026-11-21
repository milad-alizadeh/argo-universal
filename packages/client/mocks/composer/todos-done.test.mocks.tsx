import { settleLayout, wideBreakpoint } from '@repo/kit/mocks/story-layout';
import { waitFor, expect, within } from 'storybook/test';
import { Composer } from '../../src/features/composer/components/composer/composer';
import { composerProps, composerTodosDone } from '../composer-mock';
import { type Story } from './composer-story-context.test.mocks';
import { planTitle } from './composer-test-contract.test.mocks';

export function todosDone(width: number): Story {
  return {
    render: (args) => (
      <Composer
        {...composerProps({
          ...args,
          sessionStarted: true,
          plan: composerTodosDone,
        })}
      />
    ),
    play: async ({ canvas, userEvent }) => {
      const overlay = within(document.body);
      await settleLayout(width);
      const plan = canvas.getByRole('button', { name: 'Todos' });
      await expect(plan).toBeVisible();

      if (width >= wideBreakpoint()) {
        await expect(plan).toHaveTextContent('Todos 3/3');
        await userEvent.click(plan);
        await waitFor(() => expect(canvas.getByText(planTitle)).toBeVisible());
      } else {
        await expect(within(plan).getByText('3/3')).toBeVisible();
        await expect(plan).not.toHaveTextContent('Todos');
        await userEvent.click(plan);
        await waitFor(() => expect(overlay.getByText(planTitle)).toBeVisible());
        const sheet = within(overlay.getByRole('dialog', { name: 'Todos' }));
        await expect(
          sheet.getAllByRole('heading', { name: 'Todos' }),
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
