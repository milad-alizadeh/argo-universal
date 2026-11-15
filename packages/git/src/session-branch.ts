const sessionBranchPrefix = 'argo/';

// The prefix is stored data and must survive a product rename.
export const sessionBranch = (id: string): string =>
  `${sessionBranchPrefix}${id}`;

export const isSessionBranch = (branch: string | null, id: string): boolean =>
  branch === sessionBranch(id);

// The Session a Session branch was made for, or null for any other branch.
export const sessionBranchOwner = (branch: string | null): string | null =>
  branch?.startsWith(sessionBranchPrefix)
    ? branch.slice(sessionBranchPrefix.length)
    : null;
