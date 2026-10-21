export type WebPreview = {
  kind: 'web';
  title: string;
  domain: string;
  image?: string;
  icon?: string;
};

export type GitPreview = {
  kind: 'issue' | 'pullRequest' | 'commit';
  title: string;
  repository: string;
  author: string;
  avatar?: string;
  createdAt: string;
  sha?: string;
  number?: number;
  state?: 'open' | 'closed' | 'merged' | 'draft';
  additions?: number;
  deletions?: number;
};

// Image URLs here are already resolved by the App's Server adapter.
export type LinkPreviewCardData = WebPreview | GitPreview;
