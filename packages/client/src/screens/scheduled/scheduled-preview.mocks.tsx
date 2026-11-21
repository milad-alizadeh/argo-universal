import { SizeClass } from '@repo/kit/size-class/size-class';
import type { ReactElement, ReactNode } from 'react';
import { FramePagePreview } from '../../features/frame/frame/frame-page-preview.mocks';
import { SessionDetailView } from '../sessions/$id/session-detail-view';
import { idleSession } from '../sessions/$id/session-detail-view.mocks';
import { SessionPageHeader } from '../sessions/$id/session-page-header';
import { latestSchedule } from './scheduled-fixtures';

export function SchedulePreviewFrame({
  list,
}: {
  list: ReactNode;
}): ReactElement {
  return (
    <SizeClass
      compact={list}
      wide={
        <FramePagePreview
          list={list}
          page={<LatestScheduledRun />}
          section="scheduled"
        />
      }
    />
  );
}

function LatestScheduledRun(): ReactElement {
  return (
    <SessionDetailView
      state="open"
      {...idleSession}
      header={{ ...idleSession.header, title: latestSchedule.name }}
      drawHeader={(page) => <SessionPageHeader {...page} />}
    />
  );
}
