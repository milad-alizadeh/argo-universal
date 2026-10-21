import { layoutWidths } from '@repo/kit/each-layout';
import { settleViewport } from '@repo/kit/settle-viewport';
import { expect } from 'storybook/test';
import { waitFor } from 'storybook/test';
import { composerProps } from '../../../../../mocks/composer-mock';
import type { Story } from '../../../../../mocks/composer/composer-story-context.test.mocks';
import { dark } from '../../../../../mocks/composer/composer-story-context.test.mocks';
import { meta as composerTestMeta } from '../../../../../mocks/composer/composer-story-context.test.mocks';
import { planStepsId } from '../../../../../mocks/composer/composer-test-contract.test.mocks';
import { expandedAttribute } from '../../../../../mocks/composer/composer-test-contract.test.mocks';
import { planTitle } from '../../../../../mocks/composer/composer-test-contract.test.mocks';
import { runningPlanStepLabel } from '../../../../../mocks/composer/composer-test-contract.test.mocks';
import { planDone } from '../../../../../mocks/composer/plan-done.test.mocks';
import { equalPlanSteps } from '../../../../../mocks/composer/plan-steps.test.mocks';
import { sessionControls } from '../../../../../mocks/composer/session-controls.test.mocks';
import { Composer } from './composer';

const meta = { ...composerTestMeta, title: 'Tests/Composer' };

export default meta;

export const SessionControlsPhone = sessionControls(layoutWidths.phone);

export const SessionControlsWide = sessionControls(layoutWidths.wide);

export const PlanDonePhone = planDone(layoutWidths.phone);

export const PlanDoneWide = planDone(layoutWidths.wide);

export const PlanDonePhoneDark: Story = { ...PlanDonePhone, ...dark };

export const PlanDoneWideDark: Story = { ...PlanDoneWide, ...dark };

export const EqualPlanStepsPhoneFirstAgent = equalPlanSteps(
  layoutWidths.phone,
  0,
);

export const EqualPlanStepsPhoneSecondAgent = equalPlanSteps(
  layoutWidths.phone,
  1,
);

export const EqualPlanStepsWideFirstAgent = equalPlanSteps(
  layoutWidths.wide,
  0,
);

export const EqualPlanStepsWideSecondAgent = equalPlanSteps(
  layoutWidths.wide,
  1,
);

export const NoPlan: Story = {
  render: (args) => (
    <Composer {...composerProps({ ...args, sessionStarted: true, plan: [] })} />
  ),
  play: async ({ canvas }) => {
    for (const width of [layoutWidths.phone, layoutWidths.wide]) {
      await settleViewport(width);
      await expect(
        canvas.getByRole('textbox', { name: 'Message' }),
      ).toBeVisible();
      await expect(
        canvas.queryByRole('button', { name: 'Plan' }),
      ).not.toBeInTheDocument();
      await expect(canvas.queryByTestId(planStepsId)).not.toBeInTheDocument();
    }
  },
};

export const NoPlanDark: Story = { ...NoPlan, ...dark };

export const PlanOpensAndCloses: Story = {
  render: (args) => (
    <Composer {...composerProps({ ...args, sessionStarted: true })} />
  ),
  play: async ({ canvas, userEvent }) => {
    await settleViewport(layoutWidths.wide);
    const toggle = canvas.getByRole('button', { name: 'Plan' });
    await userEvent.click(toggle);
    await expect(toggle).toHaveAttribute(expandedAttribute, 'true');
    await waitFor(() => expect(canvas.getByText(planTitle)).toBeVisible());
    await expect(
      canvas.getByRole('progressbar', {
        name: runningPlanStepLabel,
      }),
    ).toBeVisible();
    await userEvent.click(toggle);
    await expect(toggle).toHaveAttribute(expandedAttribute, 'false');
    await waitFor(() => expect(canvas.getByText(planTitle)).not.toBeVisible());
  },
};
