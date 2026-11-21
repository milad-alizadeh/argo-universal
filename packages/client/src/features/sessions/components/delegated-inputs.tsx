import type { DelegatedInput, DelegatedSkillOffer } from '@repo/contracts';
import { Button } from '@repo/kit/primitives/actions/button';
import { Text } from '@repo/kit/primitives/content/text';
import type * as React from 'react';
import { ScrollView, View } from 'react-native';

type SkillOffer = Omit<DelegatedSkillOffer, 'originTurnId'>;

type DelegatedInputsProps = {
  requests: DelegatedInput[];
  skills?: SkillOffer[];
  confirming?: string;
  onOpen: (sessionId: string) => void;
  onOpenRequest?: (request: DelegatedInput) => void;
  onConfirm?: (id: string) => void;
};

export function DelegatedInputs({
  requests,
  skills = [],
  confirming,
  onOpen,
  onOpenRequest,
  onConfirm,
}: DelegatedInputsProps): React.JSX.Element | null {
  if (!requests.length && !skills.length) return null;

  return (
    <ScrollView
      className="w-full"
      style={{ maxHeight: 144, flexGrow: 0 }}
      contentContainerClassName="items-start gap-1 px-2"
    >
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
          onPress={() =>
            onOpenRequest
              ? onOpenRequest({ sessionId, requestId, title, kind })
              : onOpen(sessionId)
          }
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
    </ScrollView>
  );
}

const commandLabel = ({ name, arguments: args }: SkillOffer): string =>
  args ? `/${name} ${args}` : `/${name}`;

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
    <View className="w-full gap-1">
      <Text role="secondary">{commandLabel(offer)}</Text>
      <View className="flex-row flex-wrap items-center gap-1">
        <Button
          label="Run skill"
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
    </View>
  );
}
