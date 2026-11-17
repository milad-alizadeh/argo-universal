import type { CodeScannerProps } from './code-scanner';

export const waiting = {
  notice: 'Notice text',
  title: 'Scanner title',
  detail: 'Section › Item › Action',
} satisfies CodeScannerProps;

export const cameraFailed = {
  ...waiting,
  notice:
    'A longer notice that wraps onto a second line when the reason it gives runs past the width of the frame',
} satisfies CodeScannerProps;
