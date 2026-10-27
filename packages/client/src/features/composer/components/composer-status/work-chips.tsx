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
  // The plural, which names the chip to assistive tech.
  label: string;
  // What one item is called.
  singular: string;
  icon: 'agent' | 'terminal';
  work?: ComposerWork;
  disabled: boolean;
}

interface WorkCountProps {
  label: string;
  singular: string;
  work: ComposerWork;
}

// The count and word in the Secondary role, as the Usage and Context controls' are, so the glyph beside them reads in proportion.
function WorkCount({ label, singular, work }: WorkCountProps): JSX.Element {
  const className = work.running ? 'text-success' : mutedTextClassName;

  return (
    <View className="flex-row items-center gap-1">
      <StatusText role="secondary" className={className}>
        {work.count}
      </StatusText>
      <StatusText role="secondary" className="text-foreground">
        {work.count === 1 ? singular : label}
      </StatusText>
    </View>
  );
}

function WorkChip(props: WorkChipProps): JSX.Element | null {
  const { label, singular, icon, work, disabled } = props;

  if (!work) return null;
  const pressableProps = workPressableProps({ label, work, disabled });

  return (
    <ChipSurface>
      <Pressable {...pressableProps} role="button">
        <Icon name={icon} className={mutedTextClassName} />
        <WorkCount label={label} singular={singular} work={work} />
      </Pressable>
    </ChipSurface>
  );
}

interface WorkChipsProps {
  status: ComposerStatusProps;
  disabled: boolean;
}

const subagentProps = {
  label: 'Subagents',
  singular: 'Subagent',
  icon: 'agent',
} as const;

const shellProps = {
  label: 'Shells',
  singular: 'Shell',
  icon: 'terminal',
} as const;

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
  props: Pick<WorkCountProps, 'label' | 'work'> & { disabled: boolean },
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
