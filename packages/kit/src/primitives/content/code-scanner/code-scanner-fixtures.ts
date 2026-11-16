import type { CodeScannerProps } from './code-scanner';

export const looking = {
  notice: 'Looking for a code…',
  title: 'Point the camera at the code',
  detail: 'Settings › Section › Item',
} satisfies CodeScannerProps;

export const refused = {
  ...looking,
  notice:
    'Read a code, but it is not one this app takes: https://example.com/a-long-path',
} satisfies CodeScannerProps;
