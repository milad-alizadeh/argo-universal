import type { DelegatedInput, DelegatedSkillOffer } from '@repo/contracts';
import { useErrorToast } from '@repo/kit/primitives/overlays/toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSubscription } from '@trpc/tanstack-react-query';
import { useResubscribeOnReconnect, useTRPC } from '#features/connection';
import type { FeedDelegated } from '#features/feed';
import type { ElicitationFormProps } from '#features/requests';
import { sessionHref, useNavigate } from '#lib/product/navigation/navigation';
import { skillOfferElicitation } from './skill-offer-elicitation';

type DelegatedAttention = {
  items: FeedDelegated[];
  elicitation?: ElicitationFormProps;
};

export function useDelegatedAttention(sessionId: string): DelegatedAttention {
  const navigate = useNavigate();
  const trpc = useTRPC();
  const openRequest = useDelegatedRequestLink(navigate);

  const stream = useSubscription(
    trpc.session.delegatedAttention.subscriptionOptions({ sessionId }),
  );

  useResubscribeOnReconnect(stream);
  const skills = stream.data?.skills ?? [];
  const elicitation = useSkillElicitation(sessionId, skills[0]);

  const items = [
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
    ...skills.map((offer): FeedDelegated => ({
      type: 'delegated',
      id: `delegated-skill:${offer.id}`,
      sourceSessionId: offer.starterId,
      title: 'the starter Session',
      kind: 'offered_skill',
      onOpen: () => navigate(sessionHref(offer.starterId)),
    })),
  ];

  return { items, elicitation };
}

function useSkillElicitation(
  sessionId: string,
  offer: DelegatedSkillOffer | undefined,
): ElicitationFormProps | undefined {
  const trpc = useTRPC();
  const answer = useMutation(trpc.session.confirmSkill.mutationOptions());

  if (!offer) return;

  const answering = answer.variables?.offerId === offer.id;

  if (answering && answer.isSuccess) return;

  const props = skillOfferElicitation(offer, (decision) =>
    answer.mutate({ sessionId, offerId: offer.id, decision }),
  );

  return {
    ...props,
    state: { kind: answering && answer.isPending ? 'submitting' : 'open' },
    error: answering ? answer.error?.message : undefined,
  };
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
