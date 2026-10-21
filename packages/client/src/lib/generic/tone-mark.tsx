import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import { Icon } from '#primitives/content/icon';
import { Text } from '#primitives/content/text';
import type { IconName } from './symbols/icon-names';
import type { IconRoleValue } from './symbols/icon-role';

// Foundations / ChangeStage uses the same tone pairing on desktop and phone.
const palettes = {
  neutral: {
    bare: 'text-tone-neutral-600',
    disc: 'bg-tone-neutral-100',
    ink: 'text-tone-neutral-700',
  },
  success: {
    bare: 'text-tone-success-600',
    disc: 'bg-tone-success-100',
    ink: 'text-tone-success-700',
  },
  done: {
    bare: 'text-tone-done-600',
    disc: 'bg-tone-done-100',
    ink: 'text-tone-done-700',
  },
  danger: {
    bare: 'text-tone-danger-600',
    disc: 'bg-tone-danger-100',
    ink: 'text-tone-danger-700',
  },
};

type MarkTone = keyof typeof palettes;

interface ToneMarkProps {
  icon: IconName;
  tone: MarkTone;
  form?: 'bare' | 'disc';
  role?: IconRoleValue;
}

function glyph(props: ToneMarkProps): ReactElement {
  const palette = palettes[props.tone];

  return (
    <Icon
      name={props.icon}
      role={props.role ?? 'secondary'}
      className={props.form === 'disc' ? palette.ink : palette.bare}
    />
  );
}

export function ToneMark(props: ToneMarkProps): ReactElement {
  if (props.form !== 'disc') return glyph(props);

  return (
    <View
      className={`size-6 wide-type:size-5 shrink-0 items-center justify-center rounded-full ${palettes[props.tone].disc}`}
    >
      {glyph(props)}
    </View>
  );
}

export function ToneCaption({
  tone,
  children,
}: {
  tone: MarkTone;
  children: ReactNode;
}): ReactElement {
  return (
    <Text role="secondary" className={palettes[tone].bare}>
      {children}
    </Text>
  );
}
