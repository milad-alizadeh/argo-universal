import {
  contentWideMin,
  layoutWidths,
  settleLayout,
} from '@repo/kit/mocks/story-layout';
import { View } from 'react-native';
import { expect, within } from 'storybook/test';
import { ContentLayout } from '#lib/product/content-layout';
import { composerProps } from '../../../../../mocks/composer-mock';
import type { Story } from '../../../../../mocks/composer/composer-story-context.test.mocks';
import { meta as composerTestMeta } from '../../../../../mocks/composer/composer-story-context.test.mocks';
import { agentModelLabel } from '../../../../../mocks/composer/composer-test-contract.test.mocks';
import { responsiveLayout } from '../../../../../mocks/composer/responsive-layout.test.mocks';
import { composerCard } from '../../../../../mocks/composer/responsive-menu.test.mocks';
import { workStatusCounts } from '../../../../../mocks/composer/work-status.test.mocks';
import { Composer } from './composer';
import {
  longWorktreeComposer,
  startedSessionComposer,
} from './composer-fixtures';

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

export const NarrowDesktopKeepsSend: Story = {
  ...ResponsiveLayoutWide,
  play: async ({ canvas }) => {
    await settleLayout(1100);
    await expect(
      canvas.getByRole('button', { name: 'Send' }).getBoundingClientRect()
        .right,
    ).toBeLessThanOrEqual(1100);
  },
};

function parentOf(element: HTMLElement): HTMLElement {
  if (!element.parentElement) throw new Error('The callout needs its tray.');

  return element.parentElement;
}

// The tray's side margins come out of the Composer's width, so it sits centred behind the card rather than running past it.
export const RequestTrayStaysCentred: Story = {
  ...ResponsiveLayoutWide,
  args: { ...ResponsiveLayoutWide.args, callout: <View role="alert" /> },
  play: async ({ canvas }) => {
    await settleLayout(layoutWidths.wide);
    const tray = parentOf(canvas.getByRole('alert'));
    const inner = tray.getBoundingClientRect();
    const outer = parentOf(tray).getBoundingClientRect();

    await expect(outer.right - inner.right).toBeCloseTo(
      inner.left - outer.left,
      0,
    );
  },
};

/*
 * A tray tucks under the card, so its sides must sit under the card's flat edge: inset less than the card's
 * corner radius and its side and hairline show in the rounded corner's cut-out.
 */
async function expectTrayClearsCorners(
  card: Element,
  tray: Element,
): Promise<void> {
  const radius = Number.parseFloat(getComputedStyle(card).borderTopLeftRadius);
  const outer = card.getBoundingClientRect();
  const inner = tray.getBoundingClientRect();

  await expect(inner.left - outer.left).toBeGreaterThanOrEqual(radius);
  await expect(outer.right - inner.right).toBeGreaterThanOrEqual(radius);
}

export const TraysClearCardCorners: Story = {
  ...ResponsiveLayoutWide,
  args: { ...ResponsiveLayoutWide.args, callout: <View role="alert" /> },
  play: async ({ canvas }) => {
    await settleLayout(layoutWidths.wide);
    const card = composerCard(canvas.getByRole('textbox', { name: 'Message' }));
    const statusTray = card.nextElementSibling;

    if (!statusTray)
      throw new Error('The wide Composer needs its status tray.');
    await expectTrayClearsCorners(card, statusTray);
    await expectTrayClearsCorners(card, parentOf(canvas.getByRole('alert')));
  },
};

/*
 * A Frame can leave a wide window's content column just above the wide threshold, beside a Workbench or Inspector.
 * There a long worktree's name gives up its width first, and the tray stays inside the card.
 */
export const LongCheckoutTruncatesInTray: Story = {
  args: longWorktreeComposer,
  render: (args) => (
    <ContentLayout
      className="flex-none"
      style={{ width: contentWideMin() + 40 }}
    >
      <Composer {...composerProps(args)} />
    </ContentLayout>
  ),
  play: async ({ canvas }) => {
    await settleLayout(layoutWidths.wide);
    const card = composerCard(canvas.getByRole('textbox', { name: 'Message' }));
    const name = canvas.getByText(longWorktreeComposer.worktree);
    const context = canvas.getByRole('button', { name: 'Context window' });

    await expect(name.getBoundingClientRect().right).toBeLessThanOrEqual(
      card.getBoundingClientRect().right,
    );
    await expect(name.scrollWidth).toBeGreaterThan(name.clientWidth);
    await expect(context.getBoundingClientRect().right).toBeLessThan(
      name.getBoundingClientRect().left,
    );
  },
};

const leftOf = (element: HTMLElement): number =>
  element.getBoundingClientRect().left;

// The Plan's row, its steps and the status tray start their words on one edge, so the trays read as one column.
export const TrayWordsShareAnEdge: Story = {
  args: startedSessionComposer,
  render: (args) => <Composer {...composerProps(args)} />,
  play: async ({ canvas, userEvent }) => {
    await settleLayout(layoutWidths.wide);
    await userEvent.click(canvas.getByRole('button', { name: 'Plan' }));
    const edge = leftOf(canvas.getByText('Plan 1/3'));

    await expect(leftOf(canvas.getByText('Inspect the Composer layout'))).toBe(
      edge,
    );
    await expect(leftOf(canvas.getByText('Usage'))).toBe(edge);
  },
};

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
