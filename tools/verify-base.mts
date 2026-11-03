// Where `pnpm verify` measures the change from: the base you pass, the open PR's base, then main (docs/agents/hooks.md).
import { spawnSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { resolveExecutable } from '@repo/executables';
import { root, run } from './hook-checks.mts';

export interface BaseCandidate {
  ref: string;
  // Printed beside the ref, so the run says why it measured from there.
  reason: string;
}

export interface Base extends BaseCandidate {
  commit: string;
}

interface BaseInput {
  // `--base <ref>` or VERIFY_BASE.
  explicit: string | undefined;
  // The open PR's base branch, as GitHub names it.
  pullRequestBase: string | undefined;
}

// A PR's base may exist only on origin, or only locally.
const remoteThenLocal = (branch: string, reason: string): BaseCandidate[] => [
  { ref: `origin/${branch}`, reason },
  { ref: branch, reason },
];

// HEAD is the last resort, in a checkout with no main: it checks only uncommitted files.
const mainRefs = (reason: string): BaseCandidate[] => [
  ...remoteThenLocal('main', reason),
  { ref: 'HEAD', reason: 'no main to compare with' },
];

// The refs to measure the change from, best first: a stacked PR checks only its own commits, not the unmerged PRs beneath it.
export function baseCandidates({
  explicit,
  pullRequestBase,
}: BaseInput): BaseCandidate[] {
  if (explicit)
    return [explicit, `origin/${explicit}`].map((ref) => ({
      ref,
      reason: 'the base you passed',
    }));

  if (!pullRequestBase) return mainRefs('no open PR found');

  return [
    ...remoteThenLocal(pullRequestBase, "the open PR's base"),
    ...mainRefs(`${pullRequestBase} is not in this checkout`),
  ];
}

// pnpm forwards the `--` in `pnpm verify -- --base <ref>`, which parseArgs would read as the end of the options.
const verifyArgs = (): string[] =>
  process.argv.slice(2).filter((arg): boolean => arg !== '--');

const explicitBase = (): string | undefined =>
  parseArgs({ args: verifyArgs(), options: { base: { type: 'string' } } })
    .values.base ||
  process.env.VERIFY_BASE ||
  undefined;

const GH_TIMEOUT_MS = 10_000;

function ghPath(): string | undefined {
  try {
    return resolveExecutable('gh');
  } catch {
    return undefined;
  }
}

// Empty without gh; a signed-out or offline gh fails at once rather than prompting or hanging verify.
function ghApi(args: string[]): string {
  const gh = ghPath();

  if (!gh) return '';

  const result = spawnSync(gh, ['api', ...args], {
    cwd: root,
    encoding: 'utf8',
    timeout: GH_TIMEOUT_MS,
    env: { ...process.env, GH_PROMPT_DISABLED: '1' },
  });

  return result.status === 0 ? result.stdout.trim() : '';
}

// The open PR's base branch for the current branch; none when detached, offline, from a fork or without a PR.
function pullRequestBase(): string {
  const branch = run('git', ['branch', '--show-current']).output.trim();

  if (!branch) return '';

  const head = encodeURIComponent(branch);

  return ghApi([
    `repos/{owner}/{repo}/pulls?head={owner}:${head}&state=open`,
    '--jq',
    '.[0].base.ref // empty',
  ]);
}

function mergeBase(candidates: BaseCandidate[]): Base | undefined {
  for (const candidate of candidates) {
    const base = run('git', ['merge-base', 'HEAD', candidate.ref]);

    if (base.status === 0) return { ...candidate, commit: base.output.trim() };
  }

  return undefined;
}

// Only a base you passed can fail: the fallbacks end at HEAD.
export function chooseBase(): Base {
  const explicit = explicitBase();

  const base = mergeBase(
    baseCandidates({
      explicit,
      pullRequestBase: explicit ? undefined : pullRequestBase(),
    }),
  );

  if (base) return base;

  process.stderr.write(`verify: no merge base with ${explicit}.\n`);

  return process.exit(1);
}
