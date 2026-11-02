import type { Issue } from './github-issues';

/*
 * What a list row already knows of an Issue, kept so the Issue's page opens with its title and status at once and
 * fills in the rest when GitHub answers.
 */
export type IssueSeeds = {
  remember: (projectId: string, issue: Issue) => void;
  of: (projectId: string, number: number) => Issue | undefined;
};

export function createIssueSeeds(): IssueSeeds {
  const seeds = new Map<string, Issue>();
  const key = (projectId: string, number: number): string =>
    `${projectId}#${number}`;

  return {
    remember: (projectId, issue) => {
      seeds.set(key(projectId, issue.number), issue);
    },
    of: (projectId, number) => seeds.get(key(projectId, number)),
  };
}
