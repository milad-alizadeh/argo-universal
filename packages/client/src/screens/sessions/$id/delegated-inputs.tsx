import type { DelegatedInput } from '@repo/contracts';
import { useErrorToast } from '@repo/kit/primitives/overlays/toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSubscription } from '@trpc/tanstack-react-query';
import type * as React from 'react';
import { useResubscribeOnReconnect, useTRPC } from '#features/connection';
import { DelegatedInputs } from '#features/sessions';
import { sessionHref, useNavigate } from '#lib/product/navigation/navigation';

export function ConnectedDelegatedInputs({
  sessionId,
}: {
  sessionId: string;
}): React.JSX.Element {
  const navigate = useNavigate();
  const trpc = useTRPC();
  const openRequest = useDelegatedRequestLink(navigate);

  const stream = useSubscription(
    trpc.session.delegatedAttention.subscriptionOptions({ sessionId }),
  );

  useResubscribeOnReconnect(stream);
  const confirm = useMutation(trpc.session.confirmSkill.mutationOptions());
  useErrorToast(
    confirm.error
      ? { title: "Couldn't run the skill", message: confirm.error.message }
      : undefined,
  );

  return (
    <DelegatedInputs
      requests={stream.data?.requests ?? []}
      skills={stream.data?.skills}
      confirming={confirm.isPending ? confirm.variables?.offerId : undefined}
      onOpen={(id) => navigate(sessionHref(id))}
      onOpenRequest={openRequest}
      onConfirm={(offerId) => confirm.mutate({ sessionId, offerId })}
    />
  );
}

function useDelegatedRequestLink(
  navigate: ReturnType<typeof useNavigate>,
): (request: DelegatedInput) => void {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const openRequest = useMutation({
    mutationFn: async ({
      sessionId: sourceId,
      requestId,
      kind,
    }: DelegatedInput) => {
      const snapshot = await queryClient.fetchQuery(
        trpc.session.get.queryOptions(
          { sessionId: sourceId },
          { staleTime: 0 },
        ),
      );

      const pending =
        kind === 'permission'
          ? snapshot.pendingPermission
          : snapshot.pendingElicitation;

      if (pending?.requestId !== requestId)
        throw new Error('This request is no longer pending.');
      navigate(sessionHref(sourceId));
    },
  });

  useErrorToast(
    openRequest.error
      ? {
          title: "Couldn't open the request",
          message: openRequest.error.message,
        }
      : undefined,
  );

  return openRequest.mutate;
}
