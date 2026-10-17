import type {
  PendingPermission,
  SessionAnswerPermissionInput,
} from '@repo/contracts';
import { useMutation } from '@tanstack/react-query';
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
  const trpc = useTRPC();

  const mutation = useMutation(
    trpc.session.answerPermission.mutationOptions({
      onSettled: props.resumeAfterCommand,
    }),
  );

  return useRequestAnswer<PendingPermission, PermissionAnswer>(props, mutation);
}
