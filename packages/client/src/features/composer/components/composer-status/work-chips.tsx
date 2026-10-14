import type { JSX } from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { Icon } from '#primitives/display/icon';
import { Pressable, contentActionClass } from '#primitives/pressable';
import type { ComposerStatusProps, ComposerWork } from '../../state/status';
import {
  ChipSurface,
  chipClassName,
  mutedTextClassName,
} from './status-surface';
import { StatusText } from './status-text';

interface WorkChipProps {
  label: string;
  icon: 'agent' | 'terminal';
  work?: ComposerWork;
  disabled: boolean;
}

interface WorkCountProps {
  label: string;
  work: ComposerWork;
}

function WorkCount({ label, work }: WorkCountProps): JSX.Element {
  const className = work.running ? 'text-success' : mutedTextClassName;

  return (
    <View className="flex-row items-center gap-1">
      <StatusText role="badge" className={className}>
        {work.count}
      </StatusText>
      <StatusText role="badge" className="select-none">
        {label}
      </StatusText>
    </View>
  );
}

function WorkChip(props: WorkChipProps): JSX.Element | null {
  const { label, icon, work, disabled } = props;

  if (!work) return null;
  const pressableProps = workPressableProps({ label, work, disabled });

  return (
    <ChipSurface glass={label === 'Subagents'}>
      <Pressable {...pressableProps} role="button">
        <Icon role="control" name={icon} className={mutedTextClassName} />
        <WorkCount label={label} work={work} />
      </Pressable>
    </ChipSurface>
  );
}

interface WorkChipsProps {
  status: ComposerStatusProps;
  disabled: boolean;
}

const subagentProps = { label: 'Subagents', icon: 'agent' } as const;

const shellProps = { label: 'Shells', icon: 'terminal' } as const;

export function WorkChips({ status, disabled }: WorkChipsProps): JSX.Element {
  return (
    <>
      <WorkChip
        {...subagentProps}
        disabled={disabled}
        work={status.subagents}
      />
      <WorkChip {...shellProps} disabled={disabled} work={status.shells} />
    </>
  );
}

interface WorkPressableProps {
  disabled: boolean;
  accessibilityLabel: string;
  onPress: () => void;
  className: string;
}

function workPressableProps(
  props: WorkCountProps & { disabled: boolean },
): WorkPressableProps {
  const { label, work, disabled } = props;

  return {
    disabled,
    accessibilityLabel: `${label}: ${work.count}`,
    onPress: work.onPress,
    className: contentActionClass({
      variant: 'ghost',
      className: cn(chipClassName, 'has-[>[data-icon]]:px-2.5'),
      disabled,
    }),
  };
}
