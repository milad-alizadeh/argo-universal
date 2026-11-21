import { settleOverlays } from '@repo/kit/mocks/settle-overlays';
import { settleLayout } from '@repo/kit/mocks/story-layout';
import { Button } from '@repo/kit/primitives/actions/button';
import { Dialog } from '@repo/kit/primitives/overlays/dialog';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState, type ReactElement } from 'react';
import { expect, fn, screen, waitFor, within } from 'storybook/test';
import { FramePagePreview } from '../../features/frame/frame/frame-page-preview.mocks';
import { SessionDetailView } from '../sessions/$id/session-detail-view';
import { idleSession } from '../sessions/$id/session-detail-view.mocks';
import { SessionPageHeader } from '../sessions/$id/session-page-header';
import { ScheduleHistoryView } from './schedule-history-view';
import { scheduleHref } from './schedule-href';
import {
  latestSchedule,
  pausedSchedule,
  scheduledListFixture,
  scheduleHistoryFixture,
} from './scheduled-fixtures';
import {
  ScheduledListView,
  type ScheduledListViewProps,
} from './scheduled-list-view';

const newestTitle = 'Run after update';

const newSessionId = 'new-run';

function ScheduleHistoryPreview(): ReactElement {
  const [schedule, setSchedule] = useState(latestSchedule);
  const [shown, setShown] = useState(schedule.latestSessionId);
  const [history, setHistory] = useState(false);

  const schedules = scheduledListFixture.schedules.map((row) =>
    row.id === schedule.id ? schedule : row,
  );

  const select = (runSessionId: string): void => {
    const href = scheduleHref({
      id: schedule.id,
      latestSessionId: runSessionId,
    });

    setShown(href.params.sessionId);
    setHistory(false);
  };

  return (
    <FramePagePreview
      section="scheduled"
      list={
        <>
          <ScheduledListView
            schedules={schedules}
            selectedId={schedule.id}
            onCreate={fn()}
            onOpen={(row) => {
              if (row.latestSessionId) select(row.latestSessionId);
            }}
            onAction={(_row, action) => setHistory(action === 'history')}
          />
          <Button
            label="Append occurrence"
            onPress={() =>
              setSchedule({
                ...schedule,
                latestSessionId: newSessionId,
                nextAt: schedule.nextAt + 3_600_000,
              })
            }
          />
          <Dialog open={history} onOpenChange={setHistory}>
            {history && (
              <ScheduleHistoryView
                entries={scheduleHistoryFixture}
                onOpenSession={select}
              />
            )}
          </Dialog>
        </>
      }
      page={
        <SessionDetailView
          key={shown}
          state="open"
          {...idleSession}
          header={{
            ...idleSession.header,
            title: shown === newSessionId ? newestTitle : (shown ?? ''),
          }}
          drawHeader={(page) => <SessionPageHeader {...page} />}
        />
      }
    />
  );
}

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

export const OpensPausedRowsAndUsesTheRowMenu: Story = {
  play: async ({ args, canvas, userEvent }): Promise<void> => {
    await expect(
      canvas.queryByRole('button', { name: pausedSchedule.name }),
    ).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: 'Paused' }));

    const paused = await canvas.findByRole('button', {
      name: pausedSchedule.name,
    });

    await userEvent.pointer({ target: paused, keys: '[MouseRight]' });

    const resume = await screen.findByRole('menuitem', { name: 'Resume' });
    await expect(
      screen.queryByRole('menuitem', { name: 'Pause' }),
    ).not.toBeInTheDocument();
    await settleOverlays(resume);
    await userEvent.click(resume);
    await expect(args.onAction).toHaveBeenCalledWith(pausedSchedule, 'resume');
  },
};

export const KeepsTheEarlierSessionOpenWhenTheLatestChanges: Story = {
  render: (): ReactElement => <ScheduleHistoryPreview />,
  play: async ({ canvas, userEvent }): Promise<void> => {
    const task = canvas.getByRole('button', { name: latestSchedule.name });
    await userEvent.pointer({ target: task, keys: '[MouseRight]' });
    const history = await screen.findByRole('menuitem', { name: 'History' });
    await settleOverlays(history);
    await userEvent.click(history);

    const historyDialog = await screen.findByRole('dialog', {
      name: 'History',
    });

    await settleOverlays(historyDialog);
    const dialog = within(historyDialog);

    await waitFor(() =>
      expect(dialog.getByText(/Server was offline/)).toBeVisible(),
    );

    const previous = dialog
      .getAllByRole('button', { name: 'Session started' })
      .at(-1);

    if (!previous) throw new Error('Fixture needs an earlier Session');
    await settleOverlays(previous);
    await userEvent.click(previous);
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'History' }),
      ).not.toBeInTheDocument(),
    );
    await expect(await canvas.findByText('earlier-session')).toBeVisible();

    await userEvent.click(
      canvas.getByRole('button', { name: 'Append occurrence' }),
    );
    await expect(canvas.getByText('earlier-session')).toBeVisible();
    await expect(canvas.queryByText(newestTitle)).not.toBeInTheDocument();
    await userEvent.click(task);
    await expect(await canvas.findByText(newestTitle)).toBeVisible();
  },
};
