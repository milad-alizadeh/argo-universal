import type { AvatarProps } from './avatar-props';

const identity = { initials: 'SR', accessibilityLabel: 'Sam Rivera' } as const;

export const initialsAvatar = { ...identity } satisfies AvatarProps;

export const smallAvatar = { ...identity, size: 'sm' } satisfies AvatarProps;

export const neutralAvatar = {
  ...identity,
  status: { tone: 'neutral' },
} satisfies AvatarProps;

export const mutedAvatar = {
  ...identity,
  status: { tone: 'muted' },
} satisfies AvatarProps;

export const accentAvatar = {
  ...identity,
  status: { tone: 'accent' },
} satisfies AvatarProps;

export const infoAvatar = {
  ...identity,
  status: { tone: 'info' },
} satisfies AvatarProps;

export const successAvatar = {
  ...identity,
  status: { tone: 'success' },
} satisfies AvatarProps;

export const warningAvatar = {
  ...identity,
  status: { tone: 'warning' },
} satisfies AvatarProps;

export const dangerAvatar = {
  ...identity,
  status: { tone: 'danger' },
} satisfies AvatarProps;

export const doneAvatar = {
  ...identity,
  status: { tone: 'done' },
} satisfies AvatarProps;
