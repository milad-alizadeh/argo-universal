import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor } from 'storybook/test';
import { expectShimmerMovement } from '../../mocks/expect-shimmer';
import { liveHeaderNow, liveHeaderSteps } from '../../mocks/live-header-mock';
import { LiveHeader } from './LiveHeader';

const meta = {
  title: 'Tests/LiveHeader',
  component: LiveHeader,
  args: {
    text: 'Awaiting approval',
    source: { type: 'request' },
    startedAt: liveHeaderNow - 134_000,
    now: liveHeaderNow,
  },
} satisfies Meta<typeof LiveHeader>;
export default meta;
type Story = StoryObj<typeof meta>;

const textColor = (row: HTMLElement) =>
  getComputedStyle(row.lastElementChild ?? row).color;

export const EveryStep: Story = {
  render: () => (
    <>
      {liveHeaderSteps.map(({ step, text, source, startedAt }) => (
        <LiveHeader
          key={step}
          text={text}
          source={source}
          startedAt={startedAt}
          now={liveHeaderNow}
        />
      ))}
    </>
  ),
  play: async ({ canvas }) => {
    const { page } = await import('vitest/browser');
    for (const width of [390, 1440]) {
      await page.viewport(width, 844);
      const rows = canvas.getAllByRole('status');
      await expect(rows).toHaveLength(liveHeaderSteps.length);
      const working = rows.at(-1) as HTMLElement;
      for (const [
        index,
        { text, elapsed, source },
      ] of liveHeaderSteps.entries()) {
        const row = rows[index] as HTMLElement;
        await expect(row).toBeVisible();
        await expect(row).toHaveAccessibleName(`${text} ${elapsed}`);
        await expect(row).toHaveTextContent(`${text} ${elapsed}`);
        await expect(row.getBoundingClientRect().height).toBe(20);
        const shimmering = row.querySelectorAll('span').length > 1;
        await expect(shimmering).toBe(source.type !== 'request');
        if (source.type === 'request')
          await expect(textColor(row)).not.toBe(textColor(working));
        else {
          const icon = row.querySelector('svg');
          if (!icon) throw new Error(`${text} has no icon.`);
          await expect(getComputedStyle(icon).width).toBe('16px');
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
  args: { source: { type: 'working' }, text: 'Running pnpm typecheck' },
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
    await expect(dot.getBoundingClientRect().width).toBe(8);
  },
};

export const LongTextKeepsOneLine: Story = {
  args: {
    text: 'Checking how rows merge after a reconnect when the Server restarts mid-Turn and the phone was asleep',
    source: { type: 'working' },
    startedAt: liveHeaderNow - 18_000,
  },
  play: async ({ canvas }) => {
    const { page } = await import('vitest/browser');
    await page.viewport(390, 844);
    const row = canvas.getByRole('status');
    await expect(row.getBoundingClientRect().height).toBe(20);
    const container = row.parentElement;
    if (!container) throw new Error('Live header has no container.');
    await expect(row.scrollWidth).toBeLessThanOrEqual(container.clientWidth);
    await expect(row.getBoundingClientRect().right).toBeLessThanOrEqual(
      container.getBoundingClientRect().right,
    );
  },
};

export const ClockTicks: Story = {
  args: { source: { type: 'working' }, text: 'Working', now: undefined },
  render: (args) => <LiveHeader {...args} startedAt={Date.now() - 5_000} />,
  play: async ({ canvas }) => {
    const row = canvas.getByRole('status');
    await expect(row).toHaveAccessibleName('Working 5s');
    await waitFor(() => expect(row).toHaveAccessibleName('Working 6s'), {
      timeout: 2500,
    });
  },
};
