const sessionBranchPrefix = 'argo/';

// The prefix is stored data and must survive a product rename.
export const sessionBranch = (id: string): string =>
  `${sessionBranchPrefix}${id}`;

export const isSessionBranch = (branch: string | null, id: string): boolean =>
  branch === sessionBranch(id);
