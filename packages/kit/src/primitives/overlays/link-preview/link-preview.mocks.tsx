import type { LinkPreviewCardData } from './link-preview-card-props';

export const webPreview = {
  kind: 'web',
  title: 'Migrating to ACP v2',
  domain: 'agentclientprotocol.com',
} satisfies LinkPreviewCardData;

export const issuePreview = {
  kind: 'issue',
  title: 'Improve keyboard navigation',
  repository: 'example/app',
  number: 42,
  state: 'open',
  author: 'octocat',
  createdAt: '2026-10-19T12:00:00Z',
} satisfies LinkPreviewCardData;

export const pullPreview = {
  ...issuePreview,
  kind: 'pullRequest',
  state: 'merged',
  additions: 128,
  deletions: 42,
} satisfies LinkPreviewCardData;

export const commitPreview = {
  ...issuePreview,
  kind: 'commit',
  sha: 'a908ab6',
  title: 'Add keyboard navigation',
} satisfies LinkPreviewCardData;
