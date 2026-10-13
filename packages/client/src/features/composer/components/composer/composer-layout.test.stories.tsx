import { expect } from 'storybook/test';
import { within } from 'storybook/test';
import { composerProps } from '../../../../../mocks/composer-mock';
import type { Story } from '../../../../../mocks/composer/composer-story-context.test.mocks';
import { meta as composerTestMeta } from '../../../../../mocks/composer/composer-story-context.test.mocks';
import { agentModelLabel } from '../../../../../mocks/composer/composer-test-contract.test.mocks';
import { responsiveLayout } from '../../../../../mocks/composer/responsive-layout.test.mocks';
import { workStatusCounts } from '../../../../../mocks/composer/work-status.test.mocks';
import { layoutWidths } from '../../../../lib/generic/each-layout';
import { settleViewport } from '../../../../lib/generic/settle-viewport';
import { Composer } from './composer';
const meta = { ...composerTestMeta, title: 'Tests/Composer' };
export default meta;
export const ResponsiveLayoutPhone = responsiveLayout(layoutWidths.phone, 0);
export const ResponsiveLayoutWide = responsiveLayout(layoutWidths.wide, 0);
export const ResponsiveLayoutPhoneSecondAgent = responsiveLayout(
  layoutWidths.phone,
  1,
);
export const ResponsiveLayoutWideSecondAgent = responsiveLayout(
  layoutWidths.wide,
  1,
);
export const WorkSettledFirstAgent = workStatusCounts(0, false);
export const WorkSettledSecondAgent = workStatusCounts(1, false);
export const ShellsRunningFirstAgent = workStatusCounts(0, true);
export const ShellsRunningSecondAgent = workStatusCounts(1, true);
export const ResponsiveLayoutNarrowPhone: Story = {
  render: (args) => (
    <Composer {...composerProps({ ...args, sessionStarted: true })} />
  ),
  play: async ({ canvas }) => {
    await settleViewport(320);
    const compact = canvas.getByRole('button', { name: agentModelLabel });
    await expect(within(compact).getByText('Opus 5.5')).toBeVisible();
    await expect(within(compact).queryByText('Medium')).not.toBeInTheDocument();
    await expect(
      canvas.getByRole('button', { name: 'Send' }).getBoundingClientRect()
        .right,
    ).toBeLessThanOrEqual(320);
  },
};
