import type { DelegatedSkillOffer } from '@repo/contracts';
import type { ElicitationFormProps } from '#features/requests';

export type SkillDecision = 'run' | 'skip';

export function skillOfferElicitation(
  offer: Pick<DelegatedSkillOffer, 'id' | 'name' | 'arguments'>,
  onDecision: (decision: SkillDecision) => void,
): ElicitationFormProps {
  return {
    request: {
      requestId: `delegated-skill:${offer.id}`,
      mode: 'form',
      message: [`/${offer.name}`, offer.arguments].filter(Boolean).join(' '),
      requestedSchema: { properties: {} },
    },
    state: { kind: 'open' },
    onAnswer: ({ action }) => onDecision(action === 'accept' ? 'run' : 'skip'),
  };
}
