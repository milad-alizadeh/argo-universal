import { cn } from '#lib/generic/utils';
import type { Tone } from '#primitives/content/text';
import type { AvatarProps } from './avatar-props';

// Paper "Components / SubagentRow": a list row's medium avatar is 36 on phones and 28 on the desktop type scale.
const avatarSizes = {
  sm: 'size-6 wide-type:size-5',
  md: 'size-9 wide-type:size-7',
  lg: 'size-10',
} satisfies Record<NonNullable<AvatarProps['size']>, string>;

export const avatarClassName = (size: AvatarProps['size']): string =>
  cn('relative shrink-0', avatarSizes[size ?? 'lg']);

/*
 * A toned avatar draws its circle in the tone's 100 step and its hosted glyph in the 700 step. The grey tones (accent
 * is grey too) take tint instead: it is neutral-100 on a light card, and still shows on a dark card, whose colour
 * their 100 step becomes.
 */
const toneFills = {
  neutral: 'bg-tint',
  muted: 'bg-tint',
  accent: 'bg-tint',
  info: 'bg-tone-info-100',
  success: 'bg-tone-success-100',
  warning: 'bg-tone-warning-100',
  danger: 'bg-tone-danger-100',
  done: 'bg-tone-done-100',
} satisfies Record<Tone, string>;

const toneGlyphs = {
  neutral: 'text-tone-neutral-700',
  muted: 'text-tone-muted-700',
  accent: 'text-tone-accent-700',
  info: 'text-tone-info-700',
  success: 'text-tone-success-700',
  warning: 'text-tone-warning-700',
  danger: 'text-tone-danger-700',
  done: 'text-tone-done-700',
} satisfies Record<Tone, string>;

// Avatar's own content sits on tint (Paper Avatar master); hosted content, the Session row's logo, keeps muted.
function mediaFill(hosted: boolean, tone: Tone | undefined): string {
  if (tone) return toneFills[tone];

  return hosted ? 'bg-muted' : 'bg-tint';
}

export const avatarMediaClassName = (
  hosted: boolean,
  tone: Tone | undefined,
): string =>
  cn(
    'size-full items-center justify-center overflow-hidden rounded-full',
    mediaFill(hosted, tone),
  );

export const avatarGlyphClassName = (
  tone: Tone | undefined,
): string | undefined => (tone ? toneGlyphs[tone] : undefined);
