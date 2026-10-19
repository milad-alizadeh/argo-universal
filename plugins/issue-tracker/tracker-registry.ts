import type { Argo } from '@argo/plugin-kit';
import { githubRepositoryFromOrigin } from './github-repository';
import { createGitHubTracker } from './github-tracker';
import type {
  PublicTracker,
  TrackerRegistry,
  TrackerType,
} from './issue-types';

const githubId = 'github';

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
    icon: { sf: 'ticket', material: 'confirmation_number' },
    openClient: (originUrl) => {
      const repository = githubRepositoryFromOrigin(originUrl);

      return repository ? createGitHubTracker(argo, repository) : null;
    },
  };
}
