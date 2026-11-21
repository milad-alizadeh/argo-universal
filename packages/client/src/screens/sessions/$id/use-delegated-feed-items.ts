import type { DelegatedInput } from '@repo/contracts';
import { useErrorToast } from '@repo/kit/primitives/overlays/toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSubscription } from '@trpc/tanstack-react-query';
import { useResubscribeOnReconnect, useTRPC } from '#features/connection';
import type { FeedDelegated } from '#features/feed';
import { sessionHref, useNavigate } from '#lib/product/navigation/navigation';

export function useDelegatedFeedItems(sessionId: string): FeedDelegated[] {
  const navigate = useNavigate();
  const trpc = useTRPC();
  const openRequest = useDelegatedRequestLink(navigate);

  const stream = useSubscription(
    trpc.session.delegatedAttention.subscriptionOptions({ sessionId }),
  );

  useResubscribeOnReconnect(stream);
  const answer = useMutation(trpc.session.confirmSkill.mutationOptions());

  return [
    ...(stream.data?.requests ?? []).map((request): FeedDelegated => ({
      type: 'delegated',
      id: JSON.stringify([
        'delegated-request',
        request.sessionId,
        request.requestId,
      ]),
      sourceSessionId: request.sessionId,
      title: request.title,
      kind: request.kind,
      onOpen: () => openRequest(request),
    })),
    ...(stream.data?.skills ?? []).map((offer): FeedDelegated => ({
      type: 'delegated',
      id: `delegated-skill:${offer.id}`,
      sourceSessionId: offer.starterId,
      title: 'the starter Session',
      kind: 'offered_skill',
      command: [`/${offer.name}`, offer.arguments].filter(Boolean).join(' '),
      answering: answer.isPending && answer.variables?.offerId === offer.id,
      error:
        answer.variables?.offerId === offer.id
          ? answer.error?.message
          : undefined,
      onOpen: () => navigate(sessionHref(offer.starterId)),
      onAnswer: (decision) =>
        answer.mutate({ sessionId, offerId: offer.id, decision }),
    })),
  ];
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
