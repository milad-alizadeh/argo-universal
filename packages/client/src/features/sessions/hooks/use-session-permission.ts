import type {
  PendingPermission,
  SessionAnswerPermissionInput,
} from '@repo/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '#features/connection';
import type { PermissionRequestProps } from '#features/requests';
import { type SessionRequest, useRequestAnswer } from './use-request-answer';

type PermissionAnswer = Pick<SessionAnswerPermissionInput, 'optionId'>;

type SessionPermission = SessionRequest<PendingPermission> & {
  resumeAfterCommand: () => void;
};

// The Agent's open Permission request, answered with one of its options through the Server.
export function useSessionPermission(
  props: SessionPermission,
): PermissionRequestProps | undefined {
  const trpc = useTRPC(),
    cache = useQueryClient();

  // Always allow may have recorded a grant, which Settings › Agent access lists.
  const mutation = useMutation(
    trpc.session.answerPermission.mutationOptions({
      onSuccess: (_data, { optionId }) =>
        optionId === 'allow_always'
          ? cache.invalidateQueries({
              queryKey: trpc.agent.listGrants.queryKey(),
            })
          : undefined,
      onSettled: props.resumeAfterCommand,
    }),
  );

  return useRequestAnswer<PendingPermission, PermissionAnswer>(props, mutation);
}
