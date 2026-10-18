import {
  createGitHubTracker,
  githubRepositoryFromOrigin,
} from './github-tracker.js';

const githubId = 'github';

export function createTrackerRegistry(argo) {
  const trackers = new Map([[githubId, createGitHubType(argo)]]);

  return {
    list: () => [...trackers.values()].map(publicTracker),
    get: (id) => trackers.get(id) ?? null,
    has: (id) => trackers.has(id),
  };
}

const publicTracker = ({ id, name, icon }) => ({ id, name, icon });

function createGitHubType(argo) {
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
