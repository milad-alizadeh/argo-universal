import type { operations } from '@repo/contracts/operations';
import {
  type ErrorToast,
  useErrorToast,
} from '@repo/kit/primitives/overlays/toast';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { z } from 'zod';
import { useTRPC } from '#features/connection';

type ScheduleList = z.output<
  (typeof operations)['session.listSchedules']['result']
>;

export interface ScheduleControls {
  items: ScheduleList;
  disabled: boolean;
  manage: (id: string, action: 'pause' | 'resume' | 'delete') => void;
}

export function useSchedules(
  sessionId: string,
  shown: boolean,
): ScheduleControls {
  const session = useTRPC().session;

  const options = { enabled: shown, refetchInterval: refreshMs };

  const query = useQuery(
    session.listSchedules.queryOptions({ sessionId }, options),
  );

  const change = useChangeSchedule(sessionId, () => {
    void query.refetch();
  });

  return { items: query.data ?? [], ...change };
}

const refreshMs = 5000;

function useChangeSchedule(
  sessionId: string,
  refresh: () => void,
): Omit<ScheduleControls, 'items'> {
  const session = useTRPC().session;

  const mutation = useMutation(
    session.manageSchedule.mutationOptions({ onSuccess: refresh }),
  );

  useErrorToast(scheduleError(mutation.error));

  return {
    disabled: mutation.isPending,
    manage: (id, action): void => mutation.mutate({ sessionId, id, action }),
  };
}

const scheduleError = (
  error: Pick<Error, 'message'> | null,
): ErrorToast | undefined =>
  error
    ? { title: 'Could not update Schedule', message: error.message }
    : undefined;
