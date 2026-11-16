import { settleLayout, wideBreakpoint } from '@repo/kit/mocks/story-layout';
import { recordedSessionOptions } from '@repo/mocks/app';
import { fn, within, waitFor, expect } from 'storybook/test';
import { Composer } from '../../src/features/composer/components/composer/composer';
import { composerTodos, composerProps } from '../composer-mock';
import { type Story } from './composer-story-context.test.mocks';
import { todoStepsId, planTitle } from './composer-test-contract.test.mocks';
import { pickerCatalogs } from './recorded-catalog.test.mocks';

export function equalTodoSteps(width: number, agentIndex: number): Story {
  const catalog = pickerCatalogs[agentIndex];
  const entry = composerTodos[0];

  if (!catalog || !entry)
    throw new Error(
      'Recorded catalog needs an available Agent and a Todo list step.',
    );

  return {
    args: {
      configuration: {
        agent: catalog.agent,
        configOptions: recordedSessionOptions(catalog.agent.id),
        onConfigChange: fn(),
        checkout: { branch: 'main', newWorktree: false },
      },
    },
    render: (args) => (
      <Composer
        {...composerProps({
          ...args,
          sessionStarted: true,
          plan: [entry, { ...entry, status: 'in_progress' }],
        })}
      />
    ),
    play: async ({ canvas, userEvent }) => {
      await settleLayout(width);
      const overlay = within(document.body);
      await userEvent.click(canvas.getByRole('button', { name: 'Todos' }));

      if (width < wideBreakpoint())
        await waitFor(() => expect(overlay.getByRole('dialog')).toBeVisible());

      const list = within(
        width < wideBreakpoint()
          ? overlay.getByRole('dialog')
          : canvas.getByTestId(todoStepsId),
      );

      await waitFor(async () => {
        const steps = list.getAllByText(entry.content, { exact: true });
        await expect(steps).toHaveLength(2);

        for (const step of steps) await expect(step).toBeVisible();
      });
      await expect(
        overlay.getAllByRole('progressbar', {
          name: `${entry.content} in progress`,
        }),
      ).toHaveLength(1);
      await expect(overlay.queryByText(planTitle)).not.toBeInTheDocument();
    },
  };
}
