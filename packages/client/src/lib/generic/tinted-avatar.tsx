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

interface TintedAvatarProps {
  icon: IconName;
  tone: keyof typeof palettes;
  dimmed?: boolean;
  status?: { tone: 'success' | 'warning'; accessibilityLabel: string };
}

// Paper SubagentRow: role-tinted avatar, with an optional ringless status dot.
export function TintedAvatar(props: TintedAvatarProps): ReactElement {
  return (
    <View className={avatarClass(props)}>
      <Icon
        name={props.icon}
        role="body"
        className={palettes[props.tone].ink}
      />
      <AvatarStatus status={props.status} />
    </View>
  );
}

const avatarClass = ({ tone, dimmed }: TintedAvatarProps): string =>
  cn(
    'relative size-9 wide-type:size-7 shrink-0 self-center items-center justify-center rounded-full',
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
