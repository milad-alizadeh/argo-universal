import {
  type PermissionOutcome as Outcome,
  PermissionOptionKind,
} from '@repo/contracts';
import type * as React from 'react';
import { View } from 'react-native';
import { Text } from '#lib/generic/primitives/text';
import { Icon } from '../../../lib/generic/symbols/icon';

export interface PermissionOutcomeProps {
  outcome: Outcome;
  message?: string;
}

// The kind of option the user chose; rows written before the kind was kept carry only a native option id, which is its kind.
export function chosenPermissionKind(
  outcome: Outcome | undefined,
): PermissionOptionKind | undefined {
  if (outcome?.outcome !== 'selected') return undefined;
  return outcome.kind ?? PermissionOptionKind.safeParse(outcome.optionId).data;
}

const outcomeLabel = (
  kind: PermissionOptionKind,
  name: string | undefined,
  message: string | undefined,
): string | undefined => {
  if (kind === 'allow_once') return 'You allowed this once';
  if (kind === 'reject_once')
    return message ? `You denied: “${message}”` : 'You denied';
  return name && `You chose ${name}`;
};

export function PermissionOutcome({
  outcome,
  message,
}: PermissionOutcomeProps): React.JSX.Element | null {
  const kind = chosenPermissionKind(outcome);
  if (outcome.outcome !== 'selected' || !kind) return null;
  const label = outcomeLabel(kind, outcome.name, message);
  if (!label) return null;
  const allowed = kind === 'allow_once' || kind === 'allow_always';
  return (
    <View className="flex-row items-start gap-1.5">
      <View
        className={`${allowed ? 'w-icon-sm' : 'w-icon-md'} h-6 shrink-0 justify-center wide:h-5`}
      >
        <Icon
          name={allowed ? 'check' : 'close'}
          size={allowed ? 'xs' : 'sm'}
          className="text-muted-foreground"
        />
      </View>
      <Text role="body" className="min-w-0 flex-1 text-muted-foreground">
        {label}
      </Text>
    </View>
  );
}
