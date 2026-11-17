import type { Argo } from '@argo/plugin-kit';
import {
  atlassianSignIn,
  registerAtlassianOperations,
} from './atlassian-sign-in';
import { registerIssueOperations } from './issue-operations';
import { registerOperations } from './jira-operations';
import { defineJiraPages } from './jira-pages';
import { defineReads } from './jira-reads';
import { jiraSignIn } from './jira-sign-in';
import { createTables } from './jira-store';
import { defineSignInPage } from './sign-in-page';

/*
 * Jira Cloud in Argo (Spec 0027): sign in with a pasted scoped API token or with Atlassian, choose a site and a Jira
 * project for each Argo Project, and see that project's issues.
 */
export async function register(argo: Argo): Promise<void> {
  const signIn = jiraSignIn(argo);
  const atlassian = atlassianSignIn(argo, signIn);
  const reads = defineReads(argo, signIn.refused);

  await createTables(argo);
  // One provider answers for both: a pasted token and "Sign in with Atlassian" keep one Account.
  await atlassian.provide();
  registerOperations({ argo, reads, signIn });
  registerIssueOperations(argo);
  registerAtlassianOperations(argo, atlassian);
  defineSignInPage(argo, { paste: signIn, atlassian });
  defineJiraPages(argo, { reads, refused: signIn.refused });
}
