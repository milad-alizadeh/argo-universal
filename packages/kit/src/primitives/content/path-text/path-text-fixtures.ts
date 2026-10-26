import type { PathTextProps } from './path-text';

export const shortPath = {
  path: 'src/http/no-store.ts',
} satisfies PathTextProps;

export const rootFilePath = { path: 'README.md' } satisfies PathTextProps;

export const longPath = {
  path: 'packages/client/src/components/session/feed/hooks/useWide.ts',
} satisfies PathTextProps;

export const quietPath = { ...longPath, quiet: true } satisfies PathTextProps;

export const scrollingPath = {
  ...longPath,
  scroll: true,
} satisfies PathTextProps;
