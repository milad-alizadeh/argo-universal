import { productName } from '@repo/contracts/product-identity';

// What the scanner says it is doing, so a code that is seen and not taken, or a camera that did not start, shows its reason on screen.
export type ScanNotice =
  | { kind: 'looking' }
  | { kind: 'foreign'; seen: string }
  | { kind: 'camera-failed'; reason: string };

export const looking: ScanNotice = { kind: 'looking' };

const longest = 28;

const shortened = (seen: string): string =>
  seen.length > longest ? `${seen.slice(0, longest)}…` : seen;

// The notice after the page answered one code the camera read: `taken` is whether it was an Argo code.
export const afterRead = (taken: boolean, seen: string): ScanNotice =>
  taken ? looking : { kind: 'foreign', seen };

export const cameraFailed = (reason: string): ScanNotice => ({
  kind: 'camera-failed',
  reason,
});

export function noticeText(notice: ScanNotice): string {
  if (notice.kind === 'foreign')
    return `Read a code, but it is not an ${productName} code: ${shortened(notice.seen)}`;

  if (notice.kind === 'camera-failed')
    return `The camera could not start: ${notice.reason}`;

  return 'Point the camera at the code';
}
