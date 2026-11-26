import { ListDetail } from '@repo/kit/primitives/scaffolds/list-detail';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState, type ReactElement } from 'react';
import { expect, fn } from 'storybook/test';
import { SessionDetailView } from '../sessions/$id/session-detail-view';
import { idleSession } from '../sessions/$id/session-detail-view.mocks';
import { SessionPageHeader } from '../sessions/$id/session-page-header';
import { scheduleHref } from './schedule-href';
import {
  firstSchedule,
  scheduledListFixture,
  startedSession,
} from './scheduled-fixtures';
import {
  ScheduledListView,
  type ScheduledListViewProps,
} from './scheduled-list-view';
import { createdScheduleSession } from './scheduled-preview.mocks';

const button = 'button';

const selected = 'aria-pressed';

const recordedReply = /Why every Feed row re-renders/;

const open = fn(scheduleHref);

function ScheduledNavigation(args: ScheduledListViewProps): ReactElement {
  const [opened, setOpened] =
    useState<ScheduledListViewProps['schedules'][number]>();

  return (
    <ListDetail
      list={
        <ScheduledListView
          {...args}
          selectedId={opened?.id}
          onOpen={(schedule) => {
            setOpened(schedule);
            args.onOpen(schedule);
          }}
        />
      }
      detail={openedSchedule(opened)}
    />
  );
}

function openedSchedule(
  opened: ScheduledListViewProps['schedules'][number] | undefined,
): ReactElement | null {
  if (!opened) return null;

  const task =
    opened.id === 'review-build' ? createdScheduleSession : idleSession;

  return (
    <SessionDetailView
      state="open"
      {...task}
      header={{ ...task.header, title: opened.name }}
      drawHeader={(page) => <SessionPageHeader {...page} />}
    />
  );
}

const meta = {
  title: 'Tests/Screens/Scheduled',
  component: ScheduledListView,
  args: { ...scheduledListFixture, onCreate: fn(), onOpen: open },
  parameters: { screenPreview: true },
  render: (args): ReactElement => <ScheduledNavigation {...args} />,
} satisfies Meta<typeof ScheduledListView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const OpensTheSessionUnderScheduled: Story = {
  play: async ({ canvas, userEvent }) => {
    const latest = canvas.getByRole(button, {
      name: 'Review recent changes',
    });

    await userEvent.click(latest);
    await expect(latest).toHaveAttribute(selected, 'true');
    await expect(
      await canvas.findByRole('heading', { name: recordedReply }),
    ).toBeVisible();
    await expect(open).toHaveReturnedWith({
      pathname: '/scheduled/[id]',
      params: { id: 'review-changes' },
    });

    const first = canvas.getByRole(button, {
      name: scheduledListFixture.schedules[0]?.name,
    });

    await userEvent.click(first);
    await expect(first).toHaveAttribute(selected, 'true');
    await expect(latest).toHaveAttribute(selected, 'false');
    await expect(
      canvas.queryByRole('heading', { name: recordedReply }),
    ).not.toBeInTheDocument();
    await expect(
      await canvas.findByText(
        'Review the build and summarize any failures with links to the logs.',
      ),
    ).toBeVisible();
    await expect(open).toHaveReturnedWith({
      pathname: '/scheduled/[id]',
      params: { id: 'review-build' },
    });
    await expect(
      canvas.queryByRole(button, { name: 'Run now' }),
    ).not.toBeInTheDocument();
  },
};

const unreadTask = {
  ...startedSession,
  sessionId: firstSchedule.sessionId,
  startedBySessionId: null,
  title: firstSchedule.name,
  status: 'unread' as const,
};

export const MarksATaskUnreadAfterARun: Story = {
  args: { taskSessions: [unreadTask, startedSession] },
  play: async ({ canvas }) => {
    // One row: the task's own Session is drawn as the task, not as a Session row too.
    await expect(
      canvas.getAllByRole(button, { name: `${firstSchedule.name}, Unread` }),
    ).toHaveLength(1);
    // The started Session is idle, so the one dot is the task's.
    await expect(canvas.getByTestId('session-status')).toBeVisible();
    await expect(
      canvas.getByRole(button, { name: 'Check the build logs, Idle' }),
    ).toBeVisible();
  },
};
