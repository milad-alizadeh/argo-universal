import type { Argo, PluginProps } from '@argo/plugin-kit';
import {
  createGitHubTracker,
  githubRepositoryFromOrigin,
  type TrackerClient,
} from './github-tracker';

const githubId = 'github';

type TrackerType = {
  id: string;
  name: string;
  icon: NonNullable<PluginProps['Label']['icon']>;
  openClient: (originUrl: string | null | undefined) => TrackerClient | null;
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
    openClient: (originUrl) => {
      const repository = githubRepositoryFromOrigin(originUrl);

      return repository ? createGitHubTracker(argo, repository) : null;
    },
  };
}
