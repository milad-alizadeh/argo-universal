import { pairLinkEnabled, pairPathOf } from '@/lib/pair-link';

export function redirectSystemPath({ path }: { path: string }): string {
  return pairPathOf(path, pairLinkEnabled);
}
