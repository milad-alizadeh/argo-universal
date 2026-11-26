import { settleOverlays } from '@repo/kit/mocks/settle-overlays';
import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, screen } from 'storybook/test';
import {
  firstSchedule,
  pausedSchedule,
  scheduledListFixture,
  startedSession,
} from './scheduled-fixtures';
import {
  ScheduledListView,
  type ScheduledListViewProps,
} from './scheduled-list-view';

const meta = {
  title: 'Tests/Screens/Scheduled/Management',
  component: ScheduledListView,
  args: {
    ...scheduledListFixture,
    onCreate: fn(),
    onOpen: fn(),
    onAction: fn(),
  },
  parameters: { screenPreview: true },
  beforeEach: (): Promise<void> => settleLayout('wide'),
} satisfies Meta<ScheduledListViewProps>;

export default meta;

type Story = StoryObj<typeof meta>;

const expanded = 'aria-expanded';

export const OpensPausedRowsAndUsesTheRowMenu: Story = {
  play: async ({ args, canvas, userEvent }): Promise<void> => {
    const heading = canvas.getByRole('button', { name: 'Paused' });

    await expect(heading).toHaveAttribute(expanded, 'true');
    await userEvent.click(heading);
    await expect(heading).toHaveAttribute(expanded, 'false');
    await expect(
      canvas.queryByRole('button', { name: pausedSchedule.name }),
    ).not.toBeInTheDocument();

    await userEvent.click(heading);
    await expect(heading).toHaveAttribute(expanded, 'true');

    await userEvent.click(
      await canvas.findByRole('button', {
        name: `Schedule actions for ${pausedSchedule.name}`,
      }),
    );

    const resume = await screen.findByRole('menuitem', { name: 'Resume' });
    await expect(
      screen.queryByRole('menuitem', { name: 'Pause' }),
    ).not.toBeInTheDocument();
    await settleOverlays(resume);
    await userEvent.click(resume);
    await expect(args.onAction).toHaveBeenCalledWith(pausedSchedule, 'resume');
  },
};

export const StartedSessionsUseTheTree: Story = {
  args: {
    taskSessions: [startedSession],
    onOpenStarted: fn(),
  },
  play: async ({ args, canvas, userEvent }): Promise<void> => {
    const fold = await canvas.findByRole('button', {
      name: firstSchedule.name,
      expanded: true,
    });

    await expect(canvas.getByText(startedSession.title)).toBeVisible();
    await userEvent.click(fold);
    await expect(
      canvas.queryByText(startedSession.title),
    ).not.toBeInTheDocument();
    await userEvent.click(fold);
    await userEvent.click(
      await canvas.findByRole('button', {
        name: new RegExp(startedSession.title),
      }),
    );
    await expect(args.onOpenStarted).toHaveBeenCalledWith(
      firstSchedule,
      startedSession.sessionId,
    );
  },
};
