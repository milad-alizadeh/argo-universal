import { Icon } from '@repo/kit/primitives/content/icon';
import { Text } from '@repo/kit/primitives/content/text';
import { PhonePill } from '@repo/kit/primitives/status/pill';
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

  return <WorkChipPill {...props} work={work} />;
}

function WorkChipPill({
  work,
  ...props
}: WorkChipProps & { work: ComposerWork }): JSX.Element {
  return (
    <PhonePill
      role="button"
      accessibilityLabel={`${props.label}: ${work.count}`}
      disabled={props.disabled}
      onPress={work.onPress}
    >
      <WorkChipContent {...props} work={work} />
    </PhonePill>
  );
}

const WorkChipContent = ({
  work,
  ...props
}: WorkChipProps & { work: ComposerWork }): JSX.Element => (
  <>
    <Icon name={props.icon} />
    <Text role="control" tone={work.running ? 'success' : 'muted'}>
      {work.count}
    </Text>
    <Text role="control">
      {work.count === 1 ? props.singular : props.label}
    </Text>
  </>
);

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
  label: 'Background Tasks',
  singular: 'Background Task',
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
