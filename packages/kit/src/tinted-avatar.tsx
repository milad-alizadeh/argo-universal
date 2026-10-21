import type { ReactElement } from 'react';
import { View } from 'react-native';
import { Icon } from '#primitives/content/icon';
import { StatusDot } from '#primitives/status/status-dot';
import type { IconName } from './symbols/icon-names';
import { cn } from './utils';

const palettes = {
  info: { fill: 'bg-tone-info-100', ink: 'text-tone-info-700' },
  neutral: { fill: 'bg-tone-neutral-100', ink: 'text-tone-neutral-700' },
  done: { fill: 'bg-tone-done-100', ink: 'text-tone-done-700' },
  warning: { fill: 'bg-tone-warning-100', ink: 'text-tone-warning-700' },
  success: { fill: 'bg-tone-success-100', ink: 'text-tone-success-700' },
};

// A leading avatar stands beside a row of its own; an inline one sits on the line of text beside it.
const sizes = {
  leading: { box: 'size-9 wide-type:size-7', glyph: 'body' },
  inline: { box: 'size-6 wide-type:size-5', glyph: 'secondary' },
} as const;

interface TintedAvatarProps {
  icon: IconName;
  tone: keyof typeof palettes;
  size?: keyof typeof sizes;
  dimmed?: boolean;
  status?: { tone: 'success' | 'warning'; accessibilityLabel: string };
}

// Paper SubagentRow: role-tinted avatar, with an optional ringless status dot.
export function TintedAvatar(props: TintedAvatarProps): ReactElement {
  return (
    <View className={avatarClass(props)}>
      <Icon
        name={props.icon}
        role={sizes[props.size ?? 'leading'].glyph}
        className={palettes[props.tone].ink}
      />
      <AvatarStatus status={props.status} />
    </View>
  );
}

const avatarClass = ({ tone, size, dimmed }: TintedAvatarProps): string =>
  cn(
    'relative shrink-0 self-center items-center justify-center rounded-full',
    sizes[size ?? 'leading'].box,
    palettes[tone].fill,
    dimmed && 'opacity-50',
  );

function AvatarStatus({
  status,
}: Pick<TintedAvatarProps, 'status'>): ReactElement | null {
  if (!status) return null;

  return (
    <View className="absolute right-0 top-0">
      <StatusDot {...status} />
    </View>
  );
}
