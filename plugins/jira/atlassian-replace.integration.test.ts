import { serialiseOnOAuthPort } from '@argo/plugin-kit/testing/oauth-port';
import { expect, it } from 'vitest';
import { atlassianWords } from './atlassian-words';
import {
  issueSummary,
  issuesShown,
  lastCredential,
  projectPage,
  readsAsBearer,
  signInPage,
  signInWithAtlassian,
  startWithAtlassian,
  type AtlassianJira,
} from './mocks/atlassian-journey';
import { tokenLifetimeMs } from './mocks/atlassian-oauth';
import { person, scopedToken } from './mocks/jira-data';
import { ada, fillSignIn } from './mocks/journey';

serialiseOnOAuthPort();

const timeoutMs = 40_000;

// Signs in by pasted token, then with Atlassian, which rewrites the one Account's token to an OAuth one.
async function pastedThenAtlassian(jira: AtlassianJira): Promise<void> {
  await fillSignIn({ test: jira.test, jira: jira.jira }, ada);
  await issuesShown(jira);
  expect(lastCredential(jira)).toMatch(/^Basic /);

  // The page shows the token sign-in now, so an Agent, or a later visit, starts Atlassian's.
  await jira.test.pages.run({
    operation: 'signInWithAtlassian',
    args: {},
    serverDevice: true,
  });
  expect(await readsAsBearer(jira)).toBe(true);
}

const tokenField = (node: { type: string }): boolean =>
  node.type === 'FieldGroup.SecretField';

it(
  'rewrites the token-signed-in Account when the same person signs in with Atlassian',
  async () => {
    const jira = await startWithAtlassian();

    await pastedThenAtlassian(jira);
    expect(jira.test.accounts.list()).toMatchObject([
      { host: 'api.atlassian.com', label: person.email },
    ]);
    expect(await jira.test.log()).not.toContain(scopedToken);
  },
  timeoutMs,
);

it(
  'draws the sign-in form again when Atlassian refuses the refresh after a paste and an Atlassian sign-in',
  async () => {
    const jira = await startWithAtlassian();

    await pastedThenAtlassian(jira);
    expect(
      (await signInPage(jira)).findText(`Signed in as ${person.email}`),
    ).toBeDefined();

    jira.oauth.revoke();
    await jira.test.clock.advance(tokenLifetimeMs);
    expect((await projectPage(jira)).findText('Sign in to Jira')).toBeDefined();

    // Neither the paste nor the Atlassian sign-in still says "Signed in as", so both ways back in are offered.
    const signIn = await signInPage(jira);

    expect(signIn.findText(`Signed in as ${person.email}`)).toBeUndefined();
    expect(signIn.find(tokenField).props.title).toBe('API token');
    expect(signIn.find(atlassianWords.start).type).toBe('FieldGroup.Link');

    await signInWithAtlassian(jira, signIn);

    const page = await projectPage(jira);

    await page.draw();
    expect(page.findText(issueSummary)).toBeDefined();
    expect(jira.test.accounts.list()).toHaveLength(1);
  },
  timeoutMs,
);
