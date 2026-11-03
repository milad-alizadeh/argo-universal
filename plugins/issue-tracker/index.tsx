import type { Argo } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import { github } from './github-account';
import { createIssueChanges } from './issue-changes';
import type { IssueDeps } from './issue-deps';
import { registerIssueOperations } from './issue-operations';
import { registerIssuePages } from './issue-pages';
import { IssuesRoot } from './issue-root';
import { createIssueSeeds } from './issue-seeds';
import { registerSessionFills } from './session-slots';
import { createTrackerStorage } from './tracker-storage';

const createDeps = (api: Argo): IssueDeps => ({
  listProjects: api.projects.list,
  getSession: api.sessions.get,
  fetch: api.fetch,
  storage: createTrackerStorage(api),
  changes: createIssueChanges(),
  seeds: createIssueSeeds(),
});

export async function register(api: Argo): Promise<void> {
  await github.register(api);

  const deps = createDeps(api);

  function IssuesPage(): JSX.Element {
    return <IssuesRoot deps={deps} />;
  }

  registerIssueOperations(api, { storage: registerSessionFills(api, deps) });
  api.pages.register('/', IssuesPage);
  registerIssuePages(api, deps);
}
