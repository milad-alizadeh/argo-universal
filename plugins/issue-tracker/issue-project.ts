import type { Argo } from '@argo/plugin-kit';
import { githubRepositoryFromOrigin } from './github-repository';

export type Project = Awaited<ReturnType<Argo['projects']['list']>>[number];

export const noRemoteMessage = 'This Project has no GitHub remote.';

// A page's footer: the Project and the repository its Issues come from.
export function repositoryText(project: Project): string {
  const repository = githubRepositoryFromOrigin(project.originUrl);

  return [project.name, repository ?? 'No GitHub remote']
    .filter(Boolean)
    .join(' · ');
}
