import type { Argo } from '@argo/plugin-kit';
import { registerOperations } from './jira-operations';
import { defineJiraPages } from './jira-pages';
import { defineReads } from './jira-reads';
import { jiraSignIn } from './jira-sign-in';
import { createTables } from './jira-store';
import { defineSignInPage } from './sign-in-page';

/*
 * Jira Cloud in Argo (Spec 0027): sign in with a pasted scoped API token, choose a site and a Jira project for each
 * Argo Project, and see that project's issues.
 */
export async function register(argo: Argo): Promise<void> {
  const signIn = jiraSignIn(argo);
  const reads = defineReads(argo, signIn.refused);

  await createTables(argo);
  await signIn.flow.provide();
  registerOperations({ argo, reads, signIn });
  defineSignInPage(argo, signIn);
  defineJiraPages(argo, { reads, refused: signIn.refused });
}
