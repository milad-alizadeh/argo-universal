import type { operations } from '@repo/contracts/operations';
import {
  type ErrorToast,
  useErrorToast,
} from '@repo/kit/primitives/overlays/toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSubscription } from '@trpc/tanstack-react-query';
import type { z } from 'zod';
import { useResubscribeOnReconnect, useTRPC } from '#features/connection';
import { useResubscribeOnFocus } from './use-resubscribe-on-focus';

type ScheduleList = z.output<
  (typeof operations)['session.listSchedules']['result']
>;

type CreateSchedule = Omit<
  z.input<(typeof operations)['session.schedulePrompt']['params']>,
  'sessionId'
>;

export interface ScheduleControls {
  items: ScheduleList;
  canCreate: boolean;
  disabled: boolean;
  create: (input: CreateSchedule) => Promise<void>;
  setEnd: (id: string, endsAt: number) => Promise<void>;
  manage: (id: string, action: 'pause' | 'resume' | 'delete') => void;
}

export function useSchedules(
  sessionId: string,
  shown: boolean,
  canCreate: boolean,
): ScheduleControls {
  const session = useTRPC().session;
  const queryClient = useQueryClient();

  const query = useQuery(
    session.listSchedules.queryOptions({ sessionId }, { enabled: shown }),
  );

  // The Server pushes the list whenever a Schedule of this Session changes, from any Device; it first answers with the list as it is, which also catches up after a reconnect.
  const subscription = useSubscription(
    session.scheduleUpdates.subscriptionOptions(
      { sessionId },
      {
        enabled: shown,
        onData: (list) =>
          queryClient.setQueryData(
            session.listSchedules.queryKey({ sessionId }),
            list,
          ),
      },
    ),
  );

  useResubscribeOnReconnect(subscription);
  useResubscribeOnFocus(subscription);

  const change = useChangeSchedule(sessionId);

  return { items: query.data ?? [], canCreate, ...change };
}

// A change reaches the list through the Server's push, so a mutation does not read it again.
function useChangeSchedule(
  sessionId: string,
): Omit<ScheduleControls, 'items' | 'canCreate'> {
  const session = useTRPC().session;

  const mutation = useMutation(session.manageSchedule.mutationOptions());

  const create = useMutation(session.schedulePrompt.mutationOptions());

  useErrorToast(
    scheduleError(
      mutation.variables?.action === 'setEnd' ? null : mutation.error,
    ),
  );

  return {
    disabled: mutation.isPending || create.isPending,
    create: async (input) => {
      await create.mutateAsync({ ...input, sessionId });
    },
    setEnd: async (id, endsAt) => {
      await mutation.mutateAsync({ sessionId, id, action: 'setEnd', endsAt });
    },
    manage: (id, action): void => mutation.mutate({ sessionId, id, action }),
  };
}

const scheduleError = (
  error: Pick<Error, 'message'> | null,
): ErrorToast | undefined =>
  error
    ? { title: 'Could not update Schedule', message: error.message }
    : undefined;
