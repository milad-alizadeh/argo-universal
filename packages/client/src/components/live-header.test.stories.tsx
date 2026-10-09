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

const textColor = (row: HTMLElement): string =>
  getComputedStyle(row.lastElementChild ?? row).color;

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
      const working =
        rows[
          liveHeaderSteps.findIndex(
            (step) => step.liveHeader.source.type === 'working',
          )
        ];
      if (!working) throw new Error('Working header is missing');
      for (const [index, { liveHeader }] of liveHeaderSteps.entries()) {
        const { text, source } = liveHeader;
        const elapsed = liveHeaderElapsed;
        const row = rows[index];
        if (!row) throw new Error('Live header row is missing');
        await expect(row).toBeVisible();
        await expect(row).toHaveAccessibleName(`${text} ${elapsed}`);
        await expect(row).toHaveTextContent(`${text} ${elapsed}`);
        // One line of the Feed text role: 24 on phone, 22 from the wide breakpoint.
        await expect(row.getBoundingClientRect().height).toBe(
          width === 390 ? 24 : 22,
        );
        const shimmering = row.querySelectorAll('span').length > 1;
        await expect(shimmering).toBe(source.type !== 'request');
        if (source.type === 'request')
          await expect(textColor(row)).not.toBe(textColor(working));
        else if (source.type === 'working') {
          const mark = row.querySelector('[data-testid="working-mark"]');
          if (!mark) throw new Error(`${text} has no Working mark.`);
          await expect(mark.getBoundingClientRect().width).toBe(16);
        } else {
          const icon = row.querySelector('svg');
          if (!icon) throw new Error(`${text} has no icon.`);
          await waitFor(() =>
            expect(getComputedStyle(icon).width).toBe('16px'),
          );
          await expect(getComputedStyle(icon).color).not.toBe(
            textColor(working),
          );
        }
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
    const label = characters[0];
    if (!label) throw new Error('Live header has no characters.');
    for (const element of time)
      await expect(getComputedStyle(element).color).toBe(
        getComputedStyle(label).color,
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
    await expect(Number(getComputedStyle(dot).opacity)).toBeGreaterThanOrEqual(
      0.45,
    );
    await expect(getComputedStyle(dot).boxShadow).toContain(
      getComputedStyle(dot).backgroundColor,
    );
    // The same 6px dot as SessionRow's status.
    await expect(dot.getBoundingClientRect().width).toBe(6);
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
    await expect(row.getBoundingClientRect().height).toBe(24);
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
    for (const cell of cells)
      await expect(cell.getBoundingClientRect().width).toBeCloseTo(3.4, 1);
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
