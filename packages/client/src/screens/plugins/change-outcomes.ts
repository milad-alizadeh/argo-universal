import { ChangeDiscovery, ChangeUnread } from '@repo/contracts';
import type { PageRunAnswer } from '@repo/contracts/plugins/page-address';
import { z } from 'zod';
import type { DiscoveryResult, UnreadChange } from '#features/sessions';

type Wire = PageRunAnswer['result'];

const Listed = z.object({ changes: z.array(z.looseObject({})) });

const unavailable: DiscoveryResult = {
  result: 'unavailable',
  count: 0,
  branch: '',
  signIn: false,
};

/*
 * What `github.discover` answered, as the person is told it. An answer that is none of the five is read as unavailable,
 * never as no match: not knowing is not the same as nothing being there.
 */
export function discoveryOf(answer: Wire): DiscoveryResult {
  const read = ChangeDiscovery.safeParse(answer);

  if (!read.success) return unavailable;

  const { pullRequests, ...rest } = read.data;

  return { ...rest, count: pullRequests.length };
}

type Loose = z.infer<typeof Listed>['changes'][number];

const unreadOne = (entry: Loose): UnreadChange[] => {
  const read = ChangeUnread.safeParse(entry);

  return read.success ? [read.data] : [];
};

/*
 * The attached pull requests `github.list` or `github.refresh` could not read, which the Slot leaves out. An answer that
 * is not a list says nothing, so it answers nothing rather than none: what was known stays.
 */
export function unreadOf(answer: Wire): UnreadChange[] | undefined {
  const read = Listed.safeParse(answer);

  return read.success ? read.data.changes.flatMap(unreadOne) : undefined;
}
