import type {
  ProjectSchedule,
  ProjectScheduleCadence,
  ProjectScheduleHistoryPage,
} from '@repo/contracts/operations';
import {
  skipToken,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type UseInfiniteQueryResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import {
  useTRPC,
  type TRPC,
  type ServerMutation,
  type ClientError,
} from '#features/connection';

const listInput = {};

const refreshMs = 5000;

type ScheduleListQuery = Pick<
  UseQueryResult<ProjectSchedule[]>,
  'data' | 'isError' | 'isPending'
>;

type ProjectProcedures = TRPC['project'];

type Target = Pick<ProjectSchedule, 'id' | 'projectId'>;

type PreviewTarget = {
  projectId: string;
  cadence: ProjectScheduleCadence;
  id?: string;
};

export function useProjectSchedules(enabled = true): ScheduleListQuery {
  return useQuery(
    useTRPC().project.scheduleList.queryOptions(listInput, {
      enabled,
      refetchInterval: enabled ? refreshMs : false,
    }),
  );
}

export function useProjectSchedulePreview(input?: PreviewTarget): Pick<
  UseQueryResult<{ nextAt: number }>,
  'data'
> & {
  error: { message: string } | null;
} {
  return useQuery(
    useTRPC().project.schedulePreview.queryOptions(input ?? skipToken),
  );
}

export function useProjectScheduleHistory(
  target: Target,
): UseInfiniteQueryResult<
  InfiniteData<ProjectScheduleHistoryPage>,
  ClientError
> {
  const { scheduleHistory } = useTRPC().project;

  return useInfiniteQuery(
    scheduleHistory.infiniteQueryOptions(target, {
      getNextPageParam: (page) => page.next ?? undefined,
      refetchInterval: refreshMs,
    }),
  );
}

type ListUpdate = (current: ProjectSchedule[]) => ProjectSchedule[];

function useUpdateScheduleList(): (update?: ListUpdate) => void {
  const cache = useQueryClient();
  const { scheduleList, scheduleHistory } = useTRPC().project;

  return (update): void => {
    if (update) {
      cache.setQueryData(scheduleList.queryKey(listInput), (current) =>
        current ? update(current) : current,
      );
    }

    void cache.invalidateQueries({ queryKey: scheduleList.pathKey() });
    void cache.invalidateQueries({ queryKey: scheduleHistory.pathKey() });
  };
}

function orderedWith(
  rows: ProjectSchedule[],
  schedule: ProjectSchedule,
): ProjectSchedule[] {
  return [...rows.filter(({ id }) => id !== schedule.id), schedule].sort(
    (left, right) =>
      left.nextAt - right.nextAt || left.id.localeCompare(right.id),
  );
}

export function useCreateProjectSchedule(
  onSuccess: (schedule: ProjectSchedule) => void,
): ServerMutation<ProjectProcedures['scheduleCreate']> {
  const { scheduleCreate } = useTRPC().project;
  const updateList = useUpdateScheduleList();

  return useMutation(
    scheduleCreate.mutationOptions({
      onSuccess: (schedule) => {
        updateList((rows) => orderedWith(rows, schedule));
        onSuccess(schedule);
      },
    }),
  );
}

export function useEditProjectSchedule(
  onSuccess: (schedule: ProjectSchedule) => void,
): ServerMutation<ProjectProcedures['scheduleEdit']> {
  const { scheduleEdit } = useTRPC().project;
  const updateList = useUpdateScheduleList();

  return useMutation(
    scheduleEdit.mutationOptions({
      onSuccess: (schedule) => {
        updateList((rows) => orderedWith(rows, schedule));
        onSuccess(schedule);
      },
    }),
  );
}

export function useManageProjectSchedule(
  onDelete: () => void,
): ServerMutation<ProjectProcedures['scheduleManage']> {
  const { scheduleManage } = useTRPC().project;
  const updateList = useUpdateScheduleList();

  return useMutation(
    scheduleManage.mutationOptions({
      onSuccess: (_result, { id, action }) => {
        if (action === 'delete') {
          updateList((rows) => rows.filter((row) => row.id !== id));
          onDelete();
        } else {
          updateList();
        }
      },
    }),
  );
}

export function useRunProjectSchedule(
  onStarted: (sessionId: string) => void,
): ServerMutation<ProjectProcedures['scheduleRunNow']> {
  const { scheduleRunNow } = useTRPC().project;
  const updateList = useUpdateScheduleList();

  return useMutation(
    scheduleRunNow.mutationOptions({
      onSuccess: (result) => {
        updateList();

        if (result.outcome === 'started') onStarted(result.sessionId);
      },
    }),
  );
}
