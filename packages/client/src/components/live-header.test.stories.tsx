import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor } from 'storybook/test';
import { expectShimmerMovement } from '../../mocks/expect-shimmer';
import {
  liveHeaderElapsed,
  liveHeaderNow,
  liveHeaderSteps,
  requestHeader,
  retryHeader,
  workingHeader,
} from '../../mocks/live-header-mock';
import { settleViewport } from '../../mocks/settle-viewport';
import { LiveHeader } from './live-header';

const meta = {
  title: 'Tests/LiveHeader',
  component: LiveHeader,
  args: { liveHeader: requestHeader, now: liveHeaderNow },
} satisfies Meta<typeof LiveHeader>;
export default meta;
type Story = StoryObj<typeof meta>;

export const EveryStep: Story = {
  render: () => (
    <>
      {liveHeaderSteps.map(({ step, liveHeader, toolCall }) => (
        <LiveHeader
          key={step}
          liveHeader={liveHeader}
          toolCall={toolCall}
          now={liveHeaderNow}
        />
      ))}
    </>
  ),
  play: async ({ canvas }) => {
    for (const width of [390, 1440]) {
      await settleViewport(width);
      const rows = canvas.getAllByRole('status');
      await expect(rows).toHaveLength(liveHeaderSteps.length);
      for (const [index, { liveHeader }] of liveHeaderSteps.entries()) {
        const { text, source } = liveHeader;
        const elapsed = liveHeaderElapsed;
        const row = rows[index];
        if (!row) throw new Error('Live header row is missing');
        await expect(row).toBeVisible();
        await expect(row).toHaveAccessibleName(`${text} ${elapsed}`);
        await expect(row).toHaveTextContent(`${text} ${elapsed}`);
        const shimmering = row.querySelectorAll('span').length > 1;
        await expect(shimmering).toBe(source.type !== 'request');
        if (source.type === 'working')
          await expect(
            row.querySelector('[data-testid="working-mark"]'),
          ).not.toBeNull();
        else if (source.type !== 'request')
          await expect(row.querySelector('svg')).not.toBeNull();
      }
    }
  },
};

export const EveryStepDark: Story = {
  ...EveryStep,
  globals: { mode: 'dark' },
};

export const ElapsedTimeShimmers: Story = {
  args: { liveHeader: workingHeader },
  play: async ({ canvas }) => {
    const row = canvas.getByRole('status');
    await expectShimmerMovement(row, '2m 14s');
    const characters = Array.from(row.querySelectorAll('span'));
    const time = characters.slice(-'2m 14s'.length);
    await expect(time.map((element) => element.textContent).join('')).toBe(
      '2m 14s',
    );
  },
};

export const RequestDotBlinks: Story = {
  play: async ({ canvas }) => {
    const dot = canvas.getByTestId('live-header-dot');
    const opacity = getComputedStyle(dot).opacity;
    await waitFor(() =>
      expect(getComputedStyle(dot).opacity).not.toBe(opacity),
    );
  },
};

export const LongTextKeepsOneLine: Story = {
  args: {
    liveHeader: {
      ...workingHeader,
      text: liveHeaderSteps.map((step) => step.liveHeader.text).join(' '),
    },
  },
  play: async ({ canvas }) => {
    const { page } = await import('vitest/browser');
    await page.viewport(390, 844);
    const row = canvas.getByRole('status');
    // One line: no taller than the line height, whatever it is.
    await expect(row.getBoundingClientRect().height).toBeLessThanOrEqual(
      Number.parseFloat(getComputedStyle(row).lineHeight),
    );
    const container = row.parentElement;
    if (!container) throw new Error('Live header has no container.');
    await expect(row.scrollWidth).toBeLessThanOrEqual(container.clientWidth);
    await expect(row.getBoundingClientRect().right).toBeLessThanOrEqual(
      container.getBoundingClientRect().right,
    );
  },
};

export const ClockTicks: Story = {
  args: { now: undefined },
  render: (args) => (
    <LiveHeader
      {...args}
      liveHeader={{ ...workingHeader, startedAt: Date.now() - 5_000 }}
    />
  ),
  play: async ({ canvas }) => {
    const row = canvas.getByRole('status');
    await expect(row).toHaveAccessibleName('Working 5s');
    await waitFor(() => expect(row).toHaveAccessibleName('Working 6s'), {
      timeout: 2500,
    });
  },
};

export const WorkingMarkWalks: Story = {
  args: { liveHeader: workingHeader },
  play: async ({ canvas }) => {
    const cells = canvas.getAllByTestId('working-mark-cell');
    await expect(cells).toHaveLength(9);
    const opacities = (): string =>
      cells.map((cell) => getComputedStyle(cell).opacity).join();
    const first = opacities();
    await waitFor(() => expect(opacities()).not.toBe(first));
  },
};

export const RetryIconSpins: Story = {
  args: { liveHeader: retryHeader },
  play: async ({ canvas }) => {
    const spinner = canvas.getByTestId('live-header-retry');
    const transform = getComputedStyle(spinner).transform;
    await waitFor(() =>
      expect(getComputedStyle(spinner).transform).not.toBe(transform),
    );
  },
};

export const NoTurnHidesTime: Story = {
  args: { liveHeader: { ...requestHeader, startedAt: null } },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('status')).toHaveAccessibleName(
      requestHeader.text,
    );
  },
};
