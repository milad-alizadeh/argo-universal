import { contentActionClass } from '@repo/kit/primitives/actions/pressable';
import { Pressable } from '@repo/kit/primitives/actions/pressable';
import { Icon } from '@repo/kit/primitives/content/icon';
import type { JSX } from 'react';
import { View } from 'react-native';
import type { ComposerStatusProps, ComposerWork } from '../../utils/status';
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

// The count and word in the Secondary role, as the Usage and Context controls' are, so the glyph beside them reads in proportion.
function WorkCount({ label, work }: WorkCountProps): JSX.Element {
  const className = work.running ? 'text-success' : mutedTextClassName;

  return (
    <View className="flex-row items-center gap-1">
      <StatusText role="secondary" className={className}>
        {work.count}
      </StatusText>
      <StatusText role="secondary" className="text-foreground">
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
    <ChipSurface>
      <Pressable {...pressableProps} role="button">
        <Icon name={icon} className={mutedTextClassName} />
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
      className: chipClassName,
      disabled,
    }),
  };
}
