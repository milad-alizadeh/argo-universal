import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import { Icon } from '#primitives/content/icon';
import { Text } from '#primitives/content/text';
import { leadingMarkClass } from './leading-mark';
import type { IconName } from './symbols/icon-names';
import type { IconSizeValue } from './symbols/icon-size';

// Foundations / ChangeStage uses the same tone pairing on desktop and phone.
const palettes = {
  info: {
    bare: 'text-tone-info-600',
    disc: 'bg-tone-info-100',
    ink: 'text-tone-info-700',
  },
  warning: {
    bare: 'text-tone-warning-600',
    disc: 'bg-tone-warning-100',
    ink: 'text-tone-warning-700',
  },
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
  // Hues with no meaning, for telling one mark from another (ADR-0026, #2122).
  teal: {
    bare: 'text-tone-teal-600',
    disc: 'bg-tone-teal-100',
    ink: 'text-tone-teal-700',
  },
  pink: {
    bare: 'text-tone-pink-600',
    disc: 'bg-tone-pink-100',
    ink: 'text-tone-pink-700',
  },
};

export type MarkTone = keyof typeof palettes;

// A disc's fill and the ink on it, for a mark that draws its own disc (TintedAvatar) or a plain mark in a hue.
export interface DiscTone {
  fill: string;
  ink: string;
}

export const toneDisc = (tone: MarkTone): DiscTone => ({
  fill: palettes[tone].disc,
  ink: palettes[tone].ink,
});

// The tone's text colour beside a bare mark, for a label that is not ToneCaption, such as a link's.
export const toneTextClass = (tone: MarkTone): string => palettes[tone].bare;

interface ToneMarkProps {
  icon: IconName;
  tone: MarkTone;
  form?: 'bare' | 'disc';
  size?: IconSizeValue;
  // A disc sits on a line of text, or leads a row of its own at TintedAvatar's leading size.
  disc?: keyof typeof discSizes;
}

const discSizes = {
  inline: 'size-6 wide-type:size-5',
  leading: leadingMarkClass,
} as const;

function glyph(props: ToneMarkProps): ReactElement {
  const palette = palettes[props.tone];

  return (
    <Icon
      name={props.icon}
      size={props.size ?? 'sm'}
      className={props.form === 'disc' ? palette.ink : palette.bare}
    />
  );
}

export function ToneMark(props: ToneMarkProps): ReactElement {
  if (props.form !== 'disc') return glyph(props);

  return (
    <View
      className={`${discSizes[props.disc ?? 'inline']} shrink-0 items-center justify-center rounded-full ${palettes[props.tone].disc}`}
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
