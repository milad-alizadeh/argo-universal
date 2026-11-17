import { layoutWidths, settleLayout } from '@repo/kit/mocks/story-layout';
import { expect } from 'storybook/test';
import { waitFor } from 'storybook/test';
import { composerProps } from '../../../../../mocks/composer-mock';
import type { Story } from '../../../../../mocks/composer/composer-story-context.test.mocks';
import { dark } from '../../../../../mocks/composer/composer-story-context.test.mocks';
import { meta as composerTestMeta } from '../../../../../mocks/composer/composer-story-context.test.mocks';
import { todoStepsId } from '../../../../../mocks/composer/composer-test-contract.test.mocks';
import { expandedAttribute } from '../../../../../mocks/composer/composer-test-contract.test.mocks';
import { planTitle } from '../../../../../mocks/composer/composer-test-contract.test.mocks';
import { runningTodoStepLabel } from '../../../../../mocks/composer/composer-test-contract.test.mocks';
import { sessionControls } from '../../../../../mocks/composer/session-controls.test.mocks';
import { equalTodoSteps } from '../../../../../mocks/composer/todo-steps.test.mocks';
import { todosDone } from '../../../../../mocks/composer/todos-done.test.mocks';
import { Composer } from './composer';

const meta = { ...composerTestMeta, title: 'Tests/Composer/Todos' };

export default meta;

export const SessionControlsPhone = sessionControls(layoutWidths.phone);

export const SessionControlsWide = sessionControls(layoutWidths.wide);

export const TodosDonePhone = todosDone(layoutWidths.phone);

export const TodosDoneWide = todosDone(layoutWidths.wide);

export const TodosDonePhoneDark: Story = { ...TodosDonePhone, ...dark };

export const TodosDoneWideDark: Story = { ...TodosDoneWide, ...dark };

export const EqualTodoStepsPhoneFirstAgent = equalTodoSteps(
  layoutWidths.phone,
  0,
);

export const EqualTodoStepsPhoneSecondAgent = equalTodoSteps(
  layoutWidths.phone,
  1,
);

export const EqualTodoStepsWideFirstAgent = equalTodoSteps(
  layoutWidths.wide,
  0,
);

export const EqualTodoStepsWideSecondAgent = equalTodoSteps(
  layoutWidths.wide,
  1,
);

export const NoTodos: Story = {
  render: (args) => (
    <Composer {...composerProps({ ...args, sessionStarted: true, plan: [] })} />
  ),
  play: async ({ canvas }) => {
    for (const width of [layoutWidths.phone, layoutWidths.wide]) {
      await settleLayout(width);
      await expect(
        canvas.getByRole('textbox', { name: 'Message' }),
      ).toBeVisible();
      await expect(
        canvas.queryByRole('button', { name: 'Todos' }),
      ).not.toBeInTheDocument();
      await expect(canvas.queryByTestId(todoStepsId)).not.toBeInTheDocument();
    }
  },
};

export const NoTodosDark: Story = { ...NoTodos, ...dark };

export const TodosOpenAndClose: Story = {
  render: (args) => (
    <Composer {...composerProps({ ...args, sessionStarted: true })} />
  ),
  play: async ({ canvas, userEvent }) => {
    await settleLayout('wide');
    const toggle = canvas.getByRole('button', { name: 'Todos' });
    await userEvent.click(toggle);
    await expect(toggle).toHaveAttribute(expandedAttribute, 'true');
    await waitFor(() => expect(canvas.getByText(planTitle)).toBeVisible());
    await expect(
      canvas.getByRole('progressbar', {
        name: runningTodoStepLabel,
      }),
    ).toBeVisible();
    await userEvent.click(toggle);
    await expect(toggle).toHaveAttribute(expandedAttribute, 'false');
    await waitFor(() => expect(canvas.getByText(planTitle)).not.toBeVisible());
  },
};
