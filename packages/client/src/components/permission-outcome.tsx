import type { PermissionOutcome as Outcome } from '@repo/contracts';
import { CheckIcon, XIcon } from 'phosphor-react-native';
import { View } from 'react-native';
import { Text } from '#primitives/text';
import { Icon } from '../lib/icon';

export interface PermissionOutcomeProps {
  outcome: Outcome;
  message?: string;
}

export function PermissionOutcome({
  outcome,
  message,
}: PermissionOutcomeProps) {
  const allowed =
    outcome.outcome === 'selected' && outcome.optionId === 'allow_once';
  if (
    outcome.outcome === 'cancelled' ||
    (!allowed && outcome.optionId !== 'reject_once')
  )
    return null;
  const label = message ? `You denied: “${message}”` : 'You denied';
  return (
    <View className="flex-row items-start gap-1.5">
      <View
        className={`${allowed ? 'w-icon-sm' : 'w-icon-md'} h-5 shrink-0 justify-center`}
      >
        <Icon
          as={allowed ? CheckIcon : XIcon}
          size={allowed ? 'sm' : 'md'}
          className="text-muted-foreground"
        />
      </View>
      <Text className="min-w-0 flex-1 text-sm leading-5 text-muted-foreground">
        {allowed ? 'You allowed this once' : label}
      </Text>
    </View>
  );
}
