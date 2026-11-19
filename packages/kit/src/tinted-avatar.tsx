import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon } from '#primitives/content/icon';
import { StatusDot } from '#primitives/status/status-dot';
import type { IconName } from './symbols/icon-names';
import { useIconBox } from './symbols/icon-size';
import { cn } from './utils';

const palettes = {
  info: { fill: 'bg-tone-info-100', ink: 'text-tone-info-700' },
  neutral: { fill: 'bg-tone-neutral-100', ink: 'text-tone-neutral-700' },
  done: { fill: 'bg-tone-done-100', ink: 'text-tone-done-700' },
  warning: { fill: 'bg-tone-warning-100', ink: 'text-tone-warning-700' },
  success: { fill: 'bg-tone-success-100', ink: 'text-tone-success-700' },
  teal: { fill: 'bg-tone-teal-100', ink: 'text-tone-teal-700' },
  pink: { fill: 'bg-tone-pink-100', ink: 'text-tone-pink-700' },
};

const glyphSize = 'sm';

const styles = StyleSheet.create({
  // Leave room for SF Symbols whose drawing extends beyond their nominal size.
  inlineGlyph: { transform: [{ scale: 0.65 }] },
});

interface TintedAvatarProps {
  icon: IconName;
  accessibilityLabel?: string;
  tone: keyof typeof palettes;
  size?: 'leading' | 'inline';
  dimmed?: boolean;
  status?: { tone: 'success' | 'warning'; accessibilityLabel: string };
}

// Inline avatars fit the same icon box as the Feed's adjacent Tool calls.
export function TintedAvatar(props: TintedAvatarProps): ReactElement {
  const inlineBox = useIconBox(glyphSize);

  return (
    <View
      className={avatarClass(props)}
      accessibilityLabel={props.accessibilityLabel}
      style={props.size === 'inline' ? inlineBox : undefined}
    >
      <AvatarGlyph {...props} />
      <AvatarStatus status={props.status} />
    </View>
  );
}

function AvatarGlyph({
  icon,
  size,
  tone,
}: Pick<TintedAvatarProps, 'icon' | 'size' | 'tone'>): ReactElement {
  const glyph = (
    <Icon name={icon} size={glyphSize} className={palettes[tone].ink} />
  );

  return size === 'inline' ? (
    <View style={styles.inlineGlyph}>{glyph}</View>
  ) : (
    glyph
  );
}

const avatarClass = ({ tone, size, dimmed }: TintedAvatarProps): string =>
  cn(
    'relative shrink-0 self-center items-center justify-center rounded-full',
    size !== 'inline' && 'size-9 wide-type:size-7',
    palettes[tone].fill,
    dimmed && 'opacity-50',
  );

function AvatarStatus({
  status,
}: Pick<TintedAvatarProps, 'status'>): ReactElement | null {
  if (!status) return null;

  return (
    <View className="absolute right-0 top-0">
      <StatusDot {...status} pulse />
    </View>
  );
}
