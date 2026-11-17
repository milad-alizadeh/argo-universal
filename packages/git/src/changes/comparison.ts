import { git } from '../git';

const headsPrefix = 'refs/heads/';

const remotesPrefix = 'refs/remotes/';

const listRefsCommand = 'for-each-ref';

// The default follows the main Checkout branch's upstream when available; explicit comparisons keep their selected ref.
export type Comparison = 'main' | 'uncommitted' | { branch: string };

// Which Checkout to read, and what to compare it against; the main comparison when none is given.
export type ChangesSelection = {
  checkout: string;
  projectCheckout: string;
  comparison?: Comparison;
};

const upstreamPair = (line: string): [string, string] => {
  const [ref = '', upstream = ''] = line.split('\t');

  return [ref, upstream];
};

async function branchUpstreams(checkout: string): Promise<Map<string, string>> {
  const output = await git(checkout, [
    listRefsCommand,
    '--format=%(refname)%09%(upstream)',
    headsPrefix,
    remotesPrefix,
  ]);

  return new Map(output.split('\n').map(upstreamPair));
}

async function mainComparisonRef(
  projectCheckout: string,
): Promise<string | null> {
  const branch = (
    await git(projectCheckout, ['branch', '--show-current'])
  ).trim();

  if (!branch) return null;
  const refs = await branchUpstreams(projectCheckout);

  return trackedUpstream(branch, refs) ?? branch;
}

function trackedUpstream(
  branch: string,
  refs: ReadonlyMap<string, string>,
): string | undefined {
  const upstream = refs.get(`${headsPrefix}${branch}`);

  return upstream && refs.has(upstream) ? upstream : undefined;
}

async function baseCommit(
  checkout: string,
  comparison: Comparison,
  main: string | null,
): Promise<string> {
  if (comparison === 'uncommitted') return 'HEAD';
  const branch = comparisonBranchName(comparison, main);
  const ref = branch.startsWith('refs/') ? branch : `${headsPrefix}${branch}`;

  // The branch check and the merge-base run together; a missing branch reports as such, not as git's merge-base error.
  const mergeBase = git(checkout, ['merge-base', ref, 'HEAD']);

  mergeBase.catch(() => {});
  await requireBranch(checkout, ref, branch);

  return (await mergeBase).trim();
}

function comparisonBranchName(
  comparison: Exclude<Comparison, 'uncommitted'>,
  main: string | null,
): string {
  const branch = comparison === 'main' ? main : comparison.branch;

  if (!branch) throw new Error('The main Checkout has no branch');

  return branch;
}

async function requireBranch(
  checkout: string,
  ref: string,
  branch: string,
): Promise<void> {
  const local = (
    await git(checkout, [
      listRefsCommand,
      '--format=%(refname)',
      headsPrefix,
      remotesPrefix,
    ])
  ).split('\n');

  if (!local.includes(ref)) throw new Error(`No branch ${branch}`);
}

// The comparison commit and the default comparison's branch name, including the remote when it tracks one.
export async function comparisonBase(
  selection: ChangesSelection,
): Promise<{ main: string | null; base: string }> {
  const main = await mainComparisonRef(selection.projectCheckout);

  const base = await baseCommit(
    selection.checkout,
    selection.comparison ?? 'main',
    main,
  );

  return { main: branchLabel(main), base };
}

const branchLabel = (ref: string | null): string | null =>
  ref?.startsWith('refs/') ? ref.slice(refPrefix(ref).length) : ref;

// The branches a Checkout can be compared against: local and remote-tracking, by name and full ref.
export async function listComparisonBranches(
  checkout: string,
): Promise<{ name: string; ref: string }[]> {
  const lines = (
    await git(checkout, [
      listRefsCommand,
      '--format=%(refname)%09%(symref)',
      headsPrefix,
      remotesPrefix,
    ])
  ).split('\n');

  return lines
    .flatMap(comparisonBranch)
    .sort((left, right) => left.name.localeCompare(right.name));
}

function comparisonBranch(line: string): { ref: string; name: string }[] {
  const [ref, symref] = line.split('\t');

  if (!ref || symref) return [];
  const prefix = refPrefix(ref);

  return [{ ref, name: ref.slice(prefix.length) }];
}

function refPrefix(ref: string): string {
  return ref.startsWith(headsPrefix) ? headsPrefix : remotesPrefix;
}
