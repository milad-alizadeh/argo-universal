import type { AgentCheck } from '@repo/contracts';
import type * as React from 'react';
import { View } from 'react-native';
import { Text } from '#lib/generic/primitives/text';
import { Button } from '../../../lib/generic/primitives/button';

// undefined while the Server runs a fresh ACP initialize; readiness is never read from the saved record.
export type CustomAgentCheck = AgentCheck | undefined;
type StatusProps = { check: CustomAgentCheck; onCheck: () => void };

export function ReadinessChip({
  check,
}: {
  check: CustomAgentCheck;
}): React.JSX.Element {
  if (!check) return <CheckingChip />;
  if (check.status === 'ready') return <ReadyChip />;
  return <FailedChip />;
}

const chipTones = {
  checking: {
    label: 'Checking',
    tone: 'bg-muted',
    text: 'text-muted-foreground',
  },
  ready: { label: 'Ready', tone: 'bg-success/10', text: 'text-success' },
  failed: {
    label: 'Check failed',
    tone: 'bg-destructive/10',
    text: 'text-destructive',
  },
};

function Chip({ kind }: { kind: keyof typeof chipTones }): React.JSX.Element {
  const { label, tone, text } = chipTones[kind];
  return (
    <View className={`h-5 justify-center rounded-full px-2 ${tone}`}>
      <Text className={`type-badge ${text}`}>{label}</Text>
    </View>
  );
}

const CheckingChip = (): React.JSX.Element => <Chip kind="checking" />;
const ReadyChip = (): React.JSX.Element => <Chip kind="ready" />;
const FailedChip = (): React.JSX.Element => <Chip kind="failed" />;

export function CustomAgentStatus({
  check,
  onCheck,
}: StatusProps): React.JSX.Element {
  if (!check)
    return <Text className="type-secondary">Running ACP initialize…</Text>;
  if (check.status === 'ready')
    return <Text className="type-body">Answered ACP initialize</Text>;
  return <FailedStatus failure={check.failure} onCheck={onCheck} />;
}

function FailedStatus(props: {
  failure: string;
  onCheck: () => void;
}): React.JSX.Element {
  return (
    <View className="flex-row items-start gap-4">
      <View className="flex-1 gap-1">
        <Text className="type-body">Did not answer ACP initialize</Text>
        <Text className="type-code text-destructive">{props.failure}</Text>
      </View>
      <CheckAgain onPress={props.onCheck} />
    </View>
  );
}

function CheckAgain({ onPress }: { onPress: () => void }): React.JSX.Element {
  return (
    <Button
      variant="outline"
      size="sm"
      onPress={onPress}
      label={'Check again'}
    />
  );
}
