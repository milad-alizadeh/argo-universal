import { createGitHubTracker } from './github-tracker.js';

const trackers = new Map();

let argo;

export function registerTrackers(api) {
  argo = api;
  trackers.set('github', createGitHubType());
}

function createGitHubType() {
  return {
    name: 'GitHub Issues',
    icon: 'github',
    settingsSchema: [],
    createConnection: (repository) => createConnection(repository),
  };
}

function createConnection(repository) {
  const adapter = createGitHubTracker(argo);

  return {
    authStatus: () => adapter.authStatus(),
    listIssues: () => adapter.listIssues({ repository }),
    getIssue: (number) => adapter.getIssue({ repository, number }),
    setStatus: (number, status) =>
      adapter.setStatus({ repository, number, status }),
  };
}

export const trackerExists = (id) => trackers.has(id);

export const tracker = (id) => trackers.get(id);
