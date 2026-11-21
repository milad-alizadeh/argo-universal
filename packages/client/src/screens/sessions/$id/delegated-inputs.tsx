import { Button } from '@repo/kit/primitives/actions/button';
import { useErrorToast } from '@repo/kit/primitives/overlays/toast';
import { useMutation } from '@tanstack/react-query';
import { useSubscription } from '@trpc/tanstack-react-query';
import type * as React from 'react';
import { View } from 'react-native';
import { useResubscribeOnReconnect, useTRPC } from '#features/connection';
import { sessionHref, useNavigate } from '#lib/product/navigation/navigation';

type DelegatedInput = {
  sessionId: string;
  requestId: string;
  title: string;
  kind: 'permission' | 'elicitation';
};

type SkillOffer = {
  id: string;
  name: string;
  arguments: string;
  starterId: string;
};

type DelegatedInputsProps = {
  requests: DelegatedInput[];
  skills?: SkillOffer[];
  confirming?: string;
  onOpen: (sessionId: string) => void;
  onConfirm?: (id: string) => void;
};

export function DelegatedInputs({
  requests,
  skills = [],
  confirming,
  onOpen,
  onConfirm,
}: DelegatedInputsProps): React.JSX.Element | null {
  if (!requests.length && !skills.length) return null;

  return (
    <View className="w-full items-start gap-1 px-2">
      {requests.map(({ sessionId, requestId, title, kind }) => (
        <Button
          key={JSON.stringify([sessionId, requestId])}
          label={
            kind === 'permission'
              ? `Permission request from ${title}`
              : `Question from ${title}`
          }
          variant="secondary"
          size="sm"
          onPress={() => onOpen(sessionId)}
        />
      ))}
      {skills.map((offer) => (
        <SkillOfferActions
          key={offer.id}
          offer={offer}
          confirming={confirming === offer.id}
          onOpen={onOpen}
          onConfirm={onConfirm}
        />
      ))}
    </View>
  );
}

function SkillOfferActions({
  offer,
  confirming,
  onOpen,
  onConfirm,
}: Pick<DelegatedInputsProps, 'onOpen' | 'onConfirm'> & {
  offer: SkillOffer;
  confirming: boolean;
}): React.JSX.Element {
  return (
    <View className="w-full flex-row flex-wrap items-center gap-1">
      <Button
        label={`Run /${offer.name}${offer.arguments ? ` ${offer.arguments}` : ''}`}
        variant="secondary"
        size="sm"
        disabled={confirming}
        onPress={() => onConfirm?.(offer.id)}
      />
      <Button
        label="Open starter Session"
        variant="text"
        size="sm"
        onPress={() => onOpen(offer.starterId)}
      />
    </View>
  );
}

export function ConnectedDelegatedInputs({
  sessionId,
}: {
  sessionId: string;
}): React.JSX.Element {
  const navigate = useNavigate();
  const trpc = useTRPC();
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
      onConfirm={(offerId) => confirm.mutate({ sessionId, offerId })}
    />
  );
}
