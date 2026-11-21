import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor } from 'storybook/test';
import { ScheduleDetailView } from './schedule-detail-view';
import { longInstructions } from './schedule-detail-view-fixtures';

const meta = {
  title: 'Tests/Screens/Scheduled/Schedule',
  component: ScheduleDetailView,
  parameters: { screenPreview: true },
  args: {
    ...longInstructions,
    onRunNow: fn(),
  },
} satisfies Meta<typeof ScheduleDetailView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const LongInstructionsScrollToActions: Story = {
  beforeEach: () => settleLayout('wide'),
  play: async ({ canvas, canvasElement }) => {
    const cadence = canvas.getByText('Cadence');

    const scroller = [...canvasElement.querySelectorAll<HTMLElement>('*')].find(
      (element) =>
        element.contains(cadence) &&
        element.scrollHeight > element.clientHeight + 100 &&
        /auto|scroll/.test(getComputedStyle(element).overflowY),
    );

    await expect(scroller).toBeDefined();

    if (!scroller) throw new Error('Schedule details do not scroll');
    scroller.scrollTop = scroller.scrollHeight;
    await waitFor(() => expect(scroller.scrollTop).toBeGreaterThan(0));
    await expect(cadence).toBeVisible();
    const actionBox = cadence.getBoundingClientRect();
    const scrollBox = scroller.getBoundingClientRect();
    await expect(actionBox.bottom).toBeLessThanOrEqual(scrollBox.bottom);
  },
};

export const LongInstructionsScrollOnPhone: Story = {
  ...LongInstructionsScrollToActions,
  beforeEach: () => settleLayout('phone'),
};
