import type { ListAppearance } from '#kit/list-context';
import { type ListLookInput, resolveListLook } from '#kit/list-look';

type Platform = ListLookInput['platform'];

export const appearances = [
  'plain',
  'grouped',
  'cards',
] satisfies ListAppearance[];

export const phones = ['ios', 'android'] satisfies Platform[];

export const platforms = ['web', ...phones] satisfies Platform[];

export const platformsAndAppearances = platforms.flatMap((platform) =>
  appearances.map((appearance) => [platform, appearance] as const),
);

export const look = (
  input: Partial<ListLookInput>,
): ReturnType<typeof resolveListLook> =>
  resolveListLook({
    appearance: 'cards',
    density: 'regular',
    platform: 'web',
    menu: false,
    sidebar: false,
    ...input,
  });
