export type WebPreview = {
  kind: 'web';
  title: string;
  domain: string;
  image?: string;
  icon?: string;
};

type GitFields = {
  title: string;
  repository: string;
  author: string;
  avatar?: string;
  createdAt: string;
};

export type GitItemPreview = GitFields & {
  kind: 'issue' | 'pullRequest';
  number: number;
  state: 'open' | 'closed' | 'merged' | 'draft';
  additions?: number;
  deletions?: number;
};

export type GitPreview =
  | GitItemPreview
  | (GitFields & { kind: 'commit'; sha: string });

// Image URLs here are already resolved by the App's Server adapter.
export type LinkPreviewCardData = WebPreview | GitPreview;
