import type { Argo } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import { github } from './github-account';
import { createIssueChanges } from './issue-changes';
import type { IssueDeps } from './issue-deps';
import { registerIssueOperations } from './issue-operations';
import { createIssuePages } from './issue-pages';
import { IssuesRoot } from './issue-root';
import { createIssueSeeds } from './issue-seeds';
import { registerSessionFills } from './session-slots';
import { createTrackerStorage } from './tracker-storage';

function createDeps(api: Argo): IssueDeps {
  const shared = {
    listProjects: api.projects.list,
    getSession: api.sessions.get,
    fetch: api.fetch,
    storage: createTrackerStorage(api),
    changes: createIssueChanges(),
    seeds: createIssueSeeds(),
  };

  return { ...shared, pages: createIssuePages(api, shared) };
}

export async function register(api: Argo): Promise<void> {
  await github.register(api);

  const deps = createDeps(api);

  function IssuesPage(): JSX.Element {
    return <IssuesRoot deps={deps} />;
  }

  registerIssueOperations(api, { storage: registerSessionFills(api, deps) });
  api.pages.register('/', IssuesPage);
}
