import {
  type PermissionOutcome as Outcome,
  PermissionOptionKind,
} from '@repo/contracts';
import type * as React from 'react';
import { View } from 'react-native';
import { Icon } from '#primitives/display/icon/icon';
import { Text } from '#primitives/display/text/text';

export interface PermissionOutcomeProps {
  outcome: Outcome;
  message?: string;
}

type SelectedOutcome = Extract<Outcome, { outcome: 'selected' }>;

const selectedKind = (
  outcome: SelectedOutcome,
): PermissionOptionKind | undefined =>
  outcome.kind ?? PermissionOptionKind.safeParse(outcome.optionId).data;

// The kind of option the user chose; rows written before the kind was kept carry only a native option id, which is its kind.
export function chosenPermissionKind(
  outcome: Outcome | undefined,
): PermissionOptionKind | undefined {
  if (outcome?.outcome !== 'selected') return undefined;

  return selectedKind(outcome);
}

const chosenName = (outcome: Outcome): string | undefined =>
  outcome.outcome === 'selected' ? outcome.name : undefined;

const chosenLabel = (name: string | undefined): string | undefined =>
  name && `You chose ${name}`;

const outcomeLabels: Record<
  PermissionOptionKind,
  (name: string | undefined, message: string | undefined) => string | undefined
> = {
  allow_once: () => 'You allowed this once',
  allow_always: chosenLabel,
  reject_once: (_name, message) =>
    message ? `You denied: “${message}”` : 'You denied',
  reject_always: chosenLabel,
};

const allowedKinds = new Set<PermissionOptionKind>([
  'allow_once',
  'allow_always',
]);

interface OutcomeRowProps {
  kind: PermissionOptionKind;
  label: string;
}

function OutcomeIcon({
  kind,
}: Pick<OutcomeRowProps, 'kind'>): React.JSX.Element {
  return (
    <View className="h-6 shrink-0 justify-center wide:h-5">
      <Icon
        name={allowedKinds.has(kind) ? 'check' : 'close'}
        role="body"
        className="text-muted-foreground"
      />
    </View>
  );
}

function OutcomeRow({ kind, label }: OutcomeRowProps): React.JSX.Element {
  return (
    <View className="flex-row items-start gap-1.5">
      <OutcomeIcon kind={kind} />
      <Text role="body" className="min-w-0 flex-1 text-muted-foreground">
        {label}
      </Text>
    </View>
  );
}

export function PermissionOutcome({
  outcome,
  message,
}: PermissionOutcomeProps): React.JSX.Element | null {
  const kind = chosenPermissionKind(outcome);

  if (!kind) return null;
  const label = outcomeLabels[kind](chosenName(outcome), message);

  if (!label) return null;

  return <OutcomeRow kind={kind} label={label} />;
}
