import type { LinkPreviewData } from '@repo/contracts';
import { z } from 'zod';

type GitKind = 'issue' | 'pullRequest' | 'commit';

export type GitTarget = {
  repository: string;
  kind: GitKind;
  id: string;
  path: string;
};

export type GitPreview = {
  preview: Exclude<LinkPreviewData, { kind: 'web' }>;
  avatar?: string;
};

const user = z.object({ login: z.string(), avatar_url: z.string().optional() });

export const GitItem = z.object({
  title: z.string(),
  number: z.number(),
  state: z.enum(['open', 'closed']),
  created_at: z.string(),
  user,
  draft: z.boolean().optional(),
  merged_at: z.string().nullable().optional(),
  additions: z.number().optional(),
  deletions: z.number().optional(),
});

export const GitCommit = z.object({
  sha: z.string(),
  author: user.nullable(),
  commit: z.object({
    message: z.string(),
    author: z.object({ name: z.string(), date: z.string() }),
  }),
});

export type GitItem = z.infer<typeof GitItem>;

export type GitCommit = z.infer<typeof GitCommit>;

export type GitData = GitItem | GitCommit;

const routes = {
  issues: { kind: 'issue', api: 'issues' },
  pull: { kind: 'pullRequest', api: 'pulls' },
  commit: { kind: 'commit', api: 'commits' },
} as const;

const shortShaLength = 7;

export function gitTarget(url: URL): GitTarget | null {
  if (url.hostname !== 'github.com') return null;

  const match =
    /^\/([\w-]+)\/([\w.-]+)\/(issues|pull|commit)\/([\da-f]+)\/?$/.exec(
      url.pathname,
    );

  if (!match) return null;

  return targetOf(match);
}

function targetOf(match: RegExpExecArray): GitTarget | null {
  const [, owner, repo, route, id] = match;
  const routeName = z.enum(['issues', 'pull', 'commit']).parse(route);
  const { kind, api } = routes[routeName];

  if (!validId(kind, id)) return null;
  const checkedId = z.string().parse(id);
  const repository = `${owner}/${repo}`;

  return {
    repository,
    kind,
    id: checkedId,
    path: `repos/${repository}/${api}/${checkedId}`,
  };
}

export function gitPreview(target: GitTarget, data: GitData): GitPreview {
  return 'sha' in data
    ? commitPreview(target, data)
    : itemPreview(target, data);
}

function commitPreview(target: GitTarget, value: GitCommit): GitPreview {
  return {
    preview: {
      kind: 'commit',
      repository: target.repository,
      sha: value.sha.slice(0, shortShaLength),
      title: firstLine(value.commit.message),
      author: commitAuthor(value),
      createdAt: value.commit.author.date,
    },
    avatar: value.author?.avatar_url,
  };
}

function itemPreview(target: GitTarget, value: GitItem): GitPreview {
  return {
    preview: {
      kind: target.kind === 'issue' ? 'issue' : 'pullRequest',
      repository: target.repository,
      title: value.title,
      number: value.number,
      author: value.user.login,
      createdAt: value.created_at,
      state: itemState(value),
      ...diffTotals(value),
    },
    avatar: value.user.avatar_url,
  };
}

function itemState(value: GitItem): 'open' | 'closed' | 'merged' | 'draft' {
  if (value.merged_at) return 'merged';

  if (value.state === 'closed') return 'closed';

  return openState(value);
}

function firstLine(message: string): string {
  return message.split('\n')[0] ?? '';
}

function commitAuthor(value: GitCommit): string {
  return value.author?.login ?? value.commit.author.name;
}

function openState(value: GitItem): 'open' | 'draft' {
  return value.draft ? 'draft' : 'open';
}

function diffTotals(value: GitItem): Pick<GitItem, 'additions' | 'deletions'> {
  return { additions: value.additions, deletions: value.deletions };
}

function validId(kind: GitKind, id = ''): boolean {
  const pattern = kind === 'commit' ? /^[a-f\d]{7,40}$/ : /^[1-9]\d*$/;

  return pattern.test(id);
}
