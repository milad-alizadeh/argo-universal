import type { StaleMark } from '@repo/contracts/plugins/page-address';

const names = (mark: StaleMark, path: string): boolean =>
  mark.addresses?.some((address) => address.path === path) === true;

// Reads the stale stream until a mark names an address with this path, and answers it; none once the stream ends.
export async function markFor(
  stale: AsyncGenerator<StaleMark>,
  path: string,
): Promise<StaleMark | undefined> {
  const mark = await stale.next();

  if (mark.done) return undefined;

  return names(mark.value, path) ? mark.value : markFor(stale, path);
}
