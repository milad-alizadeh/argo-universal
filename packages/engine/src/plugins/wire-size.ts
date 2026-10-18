import type { ViewMessage, WireNode } from '@repo/contracts/plugins/wire';

export function wireSizeReason(
  value: ViewMessage | WireNode,
  limit: number,
  kind: string,
): string | null {
  return Buffer.byteLength(JSON.stringify(value), 'utf8') > limit
    ? `${kind} exceeds ${limit} bytes`
    : null;
}
