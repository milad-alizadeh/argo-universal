import { SizeClass } from '@repo/kit/size-class/size-class';
import type { ReactElement, ReactNode } from 'react';
import { FramePagePreview } from '../../features/frame/frame/frame-page-preview.mocks';
import { SessionDetailView } from '../sessions/$id/session-detail-view';
import {
  emptySession,
  idleSession,
} from '../sessions/$id/session-detail-view.mocks';
import { SessionPageHeader } from '../sessions/$id/session-page-header';
import { firstSchedule, latestSchedule } from './scheduled-fixtures';

export function SchedulePreviewFrame({
  list,
  page = <LatestScheduledRun />,
}: {
  list: ReactNode;
  page?: ReactNode;
}): ReactElement {
  return (
    <SizeClass
      compact={list}
      wide={<FramePagePreview list={list} page={page} section="scheduled" />}
    />
  );
}

export function LatestScheduledRun(): ReactElement {
  return (
    <SessionDetailView
      state="open"
      {...idleSession}
      header={{ ...idleSession.header, title: latestSchedule.name }}
      drawHeader={(page) => <SessionPageHeader {...page} />}
    />
  );
}

export const createdScheduleSession = {
  ...emptySession,
  feed: {
    ...emptySession.feed,
    items: [
      {
        type: 'row' as const,
        row: {
          id: 'created-review-build',
          sessionId: firstSchedule.sessionId,
          position: 0,
          revision: 1,
          state: 'settled' as const,
          sessionUpdate: 'notice' as const,
          turnId: null,
          severity: 'info',
          title: 'Schedule created',
          description: firstSchedule.instructions,
        },
      },
    ],
  },
};

export function NewlyScheduledSession(): ReactElement {
  return (
    <SessionDetailView
      state="open"
      {...createdScheduleSession}
      header={{ ...createdScheduleSession.header, title: firstSchedule.name }}
      drawHeader={(page) => <SessionPageHeader {...page} />}
    />
  );
}
