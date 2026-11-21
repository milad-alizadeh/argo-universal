import type { ProjectSchedule } from '@repo/contracts/operations';
import { Dialog } from '@repo/kit/primitives/overlays/dialog';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { usePathname } from 'expo-router';
import { useState, type ReactElement } from 'react';
import { useTRPC } from '#features/connection';
import { useNavigate } from '#lib/product/navigation/navigation';
import { useServerScope } from '#lib/product/server-scope';
import { ScheduleDeleteView } from './schedule-delete-view';
import {
  ScheduleFormScreen,
  type ScheduleContext,
} from './schedule-form-screen';
import { scheduleHref } from './schedule-href';
import { ScheduledListView } from './scheduled-list-view';
import {
  ConnectedScheduleHistory,
  schedulesInput,
  useScheduleManagement,
} from './scheduled-management';

const scheduleRefreshMs = 5000;

type ScheduleQuery = Pick<
  UseQueryResult<ProjectSchedule[]>,
  'data' | 'isError' | 'isPending'
>;

export function useSchedules(enabled = true): ScheduleQuery {
  return useQuery(
    useTRPC().project.scheduleList.queryOptions(schedulesInput, {
      enabled,
      refetchInterval: enabled ? scheduleRefreshMs : false,
    }),
  );
}

export function useScheduleContext(
  sessionId?: string,
): ScheduleContext | undefined {
  const { id: serverId } = useServerScope();
  const snapshots = useTRPC().session.get;

  const { data } = useQuery(
    snapshots.queryOptions(
      { sessionId: sessionId ?? '' },
      { enabled: Boolean(sessionId) },
    ),
  );

  const [context, setContext] = useState<
    ScheduleContext & { serverId: string }
  >();

  const projectId = data?.projectId;
  const agent = data?.agent;

  if (
    projectId &&
    agent &&
    (context?.projectId !== projectId ||
      context.agent !== agent ||
      context.serverId !== serverId)
  ) {
    setContext({ projectId, agent, serverId });
  }

  return context?.serverId === serverId ? context : undefined;
}

export function ScheduledListScreen({
  selectedId,
  context,
}: {
  selectedId?: string;
  context?: ScheduleContext;
}): ReactElement {
  const path = usePathname();

  const schedules = useSchedules(
    path === '/scheduled' || path.startsWith('/scheduled/'),
  );

  const navigate = useNavigate();
  const selected = schedules.data?.find(({ id }) => id === selectedId);
  const management = useScheduleManagement();

  return (
    <>
      <ScheduledListView
        schedules={schedules.data ?? []}
        selectedId={selectedId}
        status={listStatus(schedules)}
        onCreate={management.onCreate}
        onAction={management.onAction}
        onOpen={(schedule) => navigate(scheduleHref(schedule))}
      />
      <ScheduleDialog context={selected ?? context} management={management} />
    </>
  );
}

type ScheduleDialogProps = {
  context?: ScheduleContext;
  management: ReturnType<typeof useScheduleManagement>;
};

function ScheduleDialog(props: ScheduleDialogProps): ReactElement {
  const { overlay, onClose, saving } = props.management;

  return (
    <Dialog
      open={overlay !== undefined}
      onOpenChange={(open) => {
        if (!open && !saving) onClose();
      }}
    >
      <ScheduleDialogContent {...props} />
    </Dialog>
  );
}

function ScheduleDialogContent({
  context,
  management,
}: ScheduleDialogProps): ReactElement | null {
  const navigate = useNavigate();
  const { overlay, onClose, saving, onDelete } = management;

  if (!overlay) return null;

  switch (overlay.type) {
    case 'create':
      return <ScheduleFormScreen context={context} onClose={onClose} />;
    case 'edit':
      return (
        <ScheduleFormScreen
          context={overlay.schedule}
          editing={overlay.schedule}
          onClose={onClose}
        />
      );
    case 'delete':
      return (
        <ScheduleDeleteView
          schedule={overlay.schedule}
          saving={saving}
          onDelete={() => onDelete(overlay.schedule)}
        />
      );
    case 'history':
      return (
        <ConnectedScheduleHistory
          schedule={overlay.schedule}
          onOpenSession={(sessionId) => {
            onClose();
            navigate(
              scheduleHref({
                id: overlay.schedule.id,
                latestSessionId: sessionId,
              }),
            );
          }}
        />
      );
  }
}

function listStatus(
  schedules: ScheduleQuery,
): Parameters<typeof ScheduledListView>[0]['status'] {
  if (schedules.isError) return 'failed';

  if (schedules.isPending) return 'loading';

  return undefined;
}
