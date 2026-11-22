import { ListDetail } from '@repo/kit/primitives/scaffolds/list-detail';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState, type ReactElement } from 'react';
import { expect, fn } from 'storybook/test';
import { SessionDetailView } from '../sessions/$id/session-detail-view';
import { idleSession } from '../sessions/$id/session-detail-view.mocks';
import { SessionPageHeader } from '../sessions/$id/session-page-header';
import { ScheduleDetailView } from './$id/schedule-detail-view';
import { scheduleHref } from './schedule-href';
import { scheduledListFixture } from './scheduled-fixtures';
import {
  ScheduledListView,
  type ScheduledListViewProps,
} from './scheduled-list-view';

const button = 'button';

const selected = 'aria-pressed';

const recordedPrompt = /explain in markdown why a Feed list re-renders/;

const open = fn(scheduleHref);

const run = fn();

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

  if (!opened.latestSessionId)
    return <ScheduleDetailView schedule={opened} onRunNow={run} />;

  return (
    <SessionDetailView
      state="open"
      {...idleSession}
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

export const OpensTheLatestSessionUnderScheduled: Story = {
  play: async ({ canvas, userEvent }) => {
    const latest = canvas.getByRole(button, {
      name: 'Review recent changes',
    });

    await userEvent.click(latest);
    await expect(latest).toHaveAttribute(selected, 'true');
    await expect(
      await canvas.findByRole('heading', { name: recordedPrompt }),
    ).toBeVisible();
    await expect(open).toHaveReturnedWith({
      pathname: '/scheduled/[id]',
      params: { id: 'review-changes', sessionId: 'latest-session' },
    });

    const first = canvas.getByRole(button, {
      name: scheduledListFixture.schedules[0]?.name,
    });

    await userEvent.click(first);
    await expect(first).toHaveAttribute(selected, 'true');
    await expect(latest).toHaveAttribute(selected, 'false');
    await expect(
      canvas.queryByRole('heading', { name: recordedPrompt }),
    ).not.toBeInTheDocument();
    await expect(
      await canvas.findByText(
        'Review the build and summarize any failures with links to the logs.',
      ),
    ).toBeVisible();
    await expect(open).toHaveReturnedWith({
      pathname: '/scheduled/[id]',
      params: { id: 'review-build', sessionId: '' },
    });
    await userEvent.click(canvas.getByRole(button, { name: 'Run now' }));
    await expect(run).toHaveBeenCalledOnce();
  },
};
