import type { Argo, PluginProps } from '@argo/plugin-kit';
import { githubRepositoryFromOrigin } from './github-repository';
import { createGitHubTracker, type TrackerClient } from './github-tracker';

const githubId = 'github';

// The Project a client reads for: its id borrows the Project's Account, its origin names the repository.
type ClientProject = { id: string; originUrl: string | null | undefined };

type TrackerType = {
  id: string;
  name: string;
  icon: NonNullable<PluginProps['Label']['icon']>;
  openClient: (project: ClientProject) => TrackerClient | null;
};

export type PublicTracker = Pick<TrackerType, 'id' | 'name' | 'icon'>;

export type TrackerRegistry = {
  list: () => PublicTracker[];
  get: (id: string) => TrackerType | null;
  has: (id: string) => boolean;
};

export function createTrackerRegistry(argo: Argo): TrackerRegistry {
  const trackers = new Map([[githubId, createGitHubType(argo)]]);

  return {
    list: () => [...trackers.values()].map(publicTracker),
    get: (id) => trackers.get(id) ?? null,
    has: (id) => trackers.has(id),
  };
}

const publicTracker = ({ id, name, icon }: TrackerType): PublicTracker => ({
  id,
  name,
  icon,
});

function createGitHubType(argo: Argo): TrackerType {
  return {
    id: githubId,
    name: 'GitHub Issues',
    icon: 'issue',
    openClient: ({ id, originUrl }) => {
      const repository = githubRepositoryFromOrigin(originUrl);

      return repository
        ? createGitHubTracker(argo.fetch, { projectId: id, repository })
        : null;
    },
  };
}
