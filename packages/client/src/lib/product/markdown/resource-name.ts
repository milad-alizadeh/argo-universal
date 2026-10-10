import type { IconName } from '#lib/generic/symbols/icon-names';

export function resourceName(uri: string): string {
  const path = uri.replace(/\/$/, '');
  return path.slice(path.lastIndexOf('/') + 1) || uri;
}

export const resourceIcon = (uri: string): IconName =>
  uri.startsWith('file://') ? 'file' : 'resource';
