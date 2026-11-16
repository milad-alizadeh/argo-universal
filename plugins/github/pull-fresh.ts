import type { Fresh } from './pull-automations';
import type { LinkRead } from './pull-changes';
import { sameLink } from './pull-kept';
import type { PullLink } from './pull-store';

// The Session's pull requests with GitHub asked first, so a turn acts on what it says now and never on a guess.
export async function freshReads(
  { pulls }: Pick<Fresh, 'pulls'>,
  sessionId: string,
): Promise<LinkRead[]> {
  await pulls.sync([sessionId]);

  return pulls.known([sessionId]);
}

// The pull request one record is about, read fresh; one that is no longer attached has none.
export async function freshOf(
  fresh: Pick<Fresh, 'pulls'>,
  link: PullLink,
): Promise<LinkRead | undefined> {
  const reads = await freshReads(fresh, link.sessionId);

  return reads.find((read) => sameLink(read.link, link));
}
