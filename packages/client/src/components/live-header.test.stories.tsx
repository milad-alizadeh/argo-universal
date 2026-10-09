import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor } from 'storybook/test';
import {
  liveHeaderElapsed,
  liveHeaderNow,
  liveHeaderSteps,
  requestHeader,
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
        const { text } = liveHeader;
        const elapsed = liveHeaderElapsed;
        const row = rows[index];
        if (!row) throw new Error('Live header row is missing');
        await expect(row).toBeVisible();
        await expect(row).toHaveAccessibleName(`${text} ${elapsed}`);
        await expect(row).toHaveTextContent(`${text} ${elapsed}`);
      }
    }
  },
};

export const EveryStepDark: Story = {
  ...EveryStep,
  globals: { mode: 'dark' },
};

export const LongTextStaysWithinHeader: Story = {
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

export const NoTurnHidesTime: Story = {
  args: { liveHeader: { ...requestHeader, startedAt: null } },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('status')).toHaveAccessibleName(
      requestHeader.text,
    );
  },
};
