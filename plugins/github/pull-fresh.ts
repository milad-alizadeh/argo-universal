import type { LinkRead } from './pull-changes';
import { sameLink } from './pull-kept';
import type { PullLink, PullStore } from './pull-store';
import type { Pulls } from './pull-sync';

// What a Watch turn works with: the associations, and the Plugin's one way to read a pull request.
export type Watching = {
  store: PullStore;
  pulls: Pick<Pulls, 'sync' | 'known'>;
};

// The Session's pull requests with GitHub asked first, so a turn acts on what it says now and never on a guess.
export async function freshReads(
  { pulls }: Watching,
  sessionId: string,
): Promise<LinkRead[]> {
  await pulls.sync([sessionId]);

  return pulls.known([sessionId]);
}

// The pull request one record is about, read fresh; one that is no longer attached has none.
export async function freshOf(
  watching: Watching,
  link: PullLink,
): Promise<LinkRead | undefined> {
  const reads = await freshReads(watching, link.sessionId);

  return reads.find((read) => sameLink(read.link, link));
}
