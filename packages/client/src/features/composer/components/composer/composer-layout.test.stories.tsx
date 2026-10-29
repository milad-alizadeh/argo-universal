import { layoutWidths, settleLayout } from '@repo/kit/mocks/story-layout';
import { expect, isInaccessible } from 'storybook/test';
import { within } from 'storybook/test';
import { composerProps } from '../../../../../mocks/composer-mock';
import type { Story } from '../../../../../mocks/composer/composer-story-context.test.mocks';
import { meta as composerTestMeta } from '../../../../../mocks/composer/composer-story-context.test.mocks';
import { agentModelLabel } from '../../../../../mocks/composer/composer-test-contract.test.mocks';
import { responsiveLayout } from '../../../../../mocks/composer/responsive-layout.test.mocks';
import { workStatusCounts } from '../../../../../mocks/composer/work-status.test.mocks';
import { Composer } from './composer';

const meta = { ...composerTestMeta, title: 'Tests/Composer/Layout' };

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

export const DesktopTextScale: Story = {
  ...ResponsiveLayoutWide,
  args: { ...ResponsiveLayoutWide.args, placeholder: 'Write the next prompt.' },
  play: async ({ canvasElement }) => {
    await settleLayout(layoutWidths.wide);
    await expectComposerTextSize(canvasElement);
  },
};

export const NarrowDesktopTextScale: Story = {
  ...DesktopTextScale,
  play: async ({ canvasElement, canvas }) => {
    await settleLayout(1100);
    await expectComposerTextSize(canvasElement);
    await expect(
      canvas.getByRole('button', { name: 'Send' }).getBoundingClientRect()
        .right,
    ).toBeLessThanOrEqual(1100);
  },
};

const desktopConfiguration = ResponsiveLayoutWide.args?.configuration;

if (!desktopConfiguration)
  throw new Error('Desktop Composer needs configuration.');

export const DesktopDraftTextScale: Story = {
  ...DesktopTextScale,
  args: {
    ...DesktopTextScale.args,
    draft: {
      text: 'Keep the desktop Composer text consistent.',
      attachments: [],
    },
    configuration: {
      ...desktopConfiguration,
      checkout: {
        newWorktree: true,
        branch: 'codex/long-checkout-identifier-97148eeb-bd1d-4d1a-b9fe',
      },
    },
  },
};

async function expectComposerTextSize(element: HTMLElement): Promise<void> {
  const text = within(element).getAllByText(/\S/).filter(visibleText);

  await expect(text.length).toBeGreaterThan(5);

  for (const child of text)
    await expect(
      getComputedStyle(child).fontSize,
      child.textContent ?? '',
    ).toBe('14px');
}

function visibleText(element: HTMLElement): boolean {
  return !isInaccessible(element);
}

export const WorkSettledFirstAgent = workStatusCounts(0, false);

export const WorkSettledSecondAgent = workStatusCounts(1, false);

export const ShellsRunningFirstAgent = workStatusCounts(0, true);

export const ShellsRunningSecondAgent = workStatusCounts(1, true);

export const ResponsiveLayoutNarrowPhone: Story = {
  render: (args) => (
    <Composer {...composerProps({ ...args, sessionStarted: true })} />
  ),
  play: async ({ canvas }) => {
    await settleLayout(320);
    const compact = canvas.getByRole('button', { name: agentModelLabel });
    await expect(within(compact).getByText('Opus 5.5')).toBeVisible();
    await expect(within(compact).queryByText('Medium')).not.toBeInTheDocument();
    await expect(
      canvas.getByRole('button', { name: 'Send' }).getBoundingClientRect()
        .right,
    ).toBeLessThanOrEqual(320);
  },
};
