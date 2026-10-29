import { Pill } from '@repo/kit/primitives/status/pill';
import type { JSX } from 'react';
import type { ComposerStatusProps, ComposerWork } from '../../utils/status';

interface WorkChipProps {
  label: string;
  singular: string;
  icon: 'agent' | 'terminal';
  work?: ComposerWork;
  disabled: boolean;
}

function WorkChip({ work, ...props }: WorkChipProps): JSX.Element | null {
  if (!work) return null;

  return (
    <Pill
      variant="control"
      appearance="glass"
      {...workPillProps({ ...props, work })}
    />
  );
}

function workPillProps({
  work,
  ...props
}: WorkChipProps & { work: ComposerWork }): React.ComponentProps<typeof Pill> {
  return {
    text: work.count === 1 ? props.singular : props.label,
    icon: props.icon,
    count: work.count,
    countTone: work.running ? 'success' : 'muted',
    disabled: props.disabled,
    accessibilityLabel: `${props.label}: ${work.count}`,
    onPress: work.onPress,
  };
}

interface WorkChipsProps {
  status: ComposerStatusProps;
  disabled: boolean;
}

const agentChip = {
  label: 'Agents',
  singular: 'Agent',
  icon: 'agent',
} as const;

const shellChip = {
  label: 'Shells',
  singular: 'Shell',
  icon: 'terminal',
} as const;

export function WorkChips({ status, disabled }: WorkChipsProps): JSX.Element {
  return (
    <>
      <WorkChip {...agentChip} work={status.subagents} disabled={disabled} />
      <WorkChip {...shellChip} work={status.shells} disabled={disabled} />
    </>
  );
}
