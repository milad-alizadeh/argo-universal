// What looking for the Session's pull requests answered (`github.discover`), as the person is told it.
export interface DiscoveryResult {
  result: 'found' | 'no-match' | 'branchless' | 'not-github' | 'unavailable';
  // How many pull requests it found and attached (found).
  count: number;
  // The branch nothing was opened from (no-match).
  branch: string;
  // Whether signing in to GitHub again would let it look (unavailable).
  signIn: boolean;
}

// An attached pull request GitHub could not be asked about yet, so the Changes list does not hold it.
export interface UnreadChange {
  repository: string;
  number: number;
  error: string;
}

const plural = (count: number): string =>
  count === 1 ? '1 pull request' : `${count} pull requests`;

const lookedAndFailed = ({ signIn }: DiscoveryResult): string =>
  signIn
    ? 'Could not look: sign in to GitHub again, then find pull requests. Nothing attached was changed.'
    : 'Could not look on GitHub just now. Nothing attached was changed. Try again.';

const words: Record<DiscoveryResult['result'], (d: DiscoveryResult) => string> =
  {
    found: ({ count }) =>
      `Found ${plural(count)} for this branch. They are in Changes.`,
    'no-match': ({ branch }) =>
      `No pull request has been opened from ${branch} yet. If one exists elsewhere, attach it by reference.`,
    branchless: () =>
      'This Session is not on a branch, so there is nothing to look up. Attach a pull request by reference.',
    'not-github': () =>
      'This Project is not on GitHub, so its pull requests cannot be found. Attach one by reference if you have it.',
    unavailable: lookedAndFailed,
  };

/*
 * The words for each answer. A failure says it could not look, never that there is none and never that anything ended;
 * what was already attached stays.
 */
export const discoveryMessage = (found: DiscoveryResult): string =>
  words[found.result](found);

export const unreadMessage = (count: number): string =>
  `${plural(count)} could not be read`;

export const staleMessage = (stale: 'signIn' | 'failed'): string =>
  stale === 'signIn'
    ? 'Sign in to GitHub again to refresh. Showing what was last known.'
    : 'Could not refresh. Showing what was last known.';
