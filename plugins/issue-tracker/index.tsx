import type { Argo } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import { createGitHubSignIn, provideGitHubAccount } from './github-sign-in';
import { createIssueChanges } from './issue-changes';
import type { IssueDeps } from './issue-deps';
import { registerIssueOperations } from './issue-operations';
import { createIssuePages } from './issue-pages';
import { IssuesRoot } from './issue-root';
import { createIssueSeeds } from './issue-seeds';
import { registerSessionFills } from './session-slots';
import { SignIn } from './sign-in';
import { createTrackerStorage } from './tracker-storage';

// The page `contributes.accounts` names: where "Add account" for api.github.com opens.
export const signInPath = '/sign-in';

function createDeps(api: Argo, signIn: IssueDeps['signIn']): IssueDeps {
  const shared = {
    listProjects: api.projects.list,
    getSession: api.sessions.get,
    fetch: api.fetch,
    storage: createTrackerStorage(api),
    changes: createIssueChanges(),
    seeds: createIssueSeeds(),
    signIn,
  };

  return { ...shared, pages: createIssuePages(api, shared) };
}

export async function register(api: Argo): Promise<void> {
  const borrowed = await provideGitHubAccount(api);
  const signIn = createGitHubSignIn(api, borrowed);
  const deps = createDeps(api, signIn);

  function IssuesPage(): JSX.Element {
    return <IssuesRoot deps={deps} />;
  }

  function SignInPage(): JSX.Element {
    return <SignIn signIn={signIn} />;
  }

  registerIssueOperations(api, { storage: registerSessionFills(api, deps) });
  api.pages.register('/', IssuesPage);
  api.pages.register(signInPath, SignInPage);
}
