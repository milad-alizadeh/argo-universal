import { serialiseOnOAuthPort } from '@argo/plugin-kit/testing/oauth-port';
import { expect, it } from 'vitest';
import { atlassianWords } from './atlassian-words';
import {
  issuesShown,
  lastCredential,
  projectPage,
  signInPage,
  signInWithAtlassian,
  startWithAtlassian,
} from './mocks/atlassian-journey';
import { oauthSettings } from './mocks/atlassian-oauth';
import { person } from './mocks/jira-data';
import { ada, fillSignIn } from './mocks/journey';

serialiseOnOAuthPort();

const timeoutMs = 40_000;

// The project page reads Jira again once its answers are a minute old.
const readsDueMs = 60_000;

const signedInAs = (email: string): string => `Signed in as ${email}`;

const tokenField = (node: { type: string }): boolean =>
  node.type === 'FieldGroup.SecretField';

it(
  'draws the sign-in form when Jira refuses a Bearer token that has not run out, as after the app is revoked',
  async () => {
    const jira = await startWithAtlassian();

    await signInWithAtlassian(jira);
    await issuesShown(jira);

    // No refresh is due, so the provider still lends the token; Jira's 401 alone says the sign-in is gone.
    jira.oauth.revokeApp();
    await jira.test.clock.advance(readsDueMs);

    const page = await projectPage(jira);

    await page.draw();
    expect(lastCredential(jira)).toBe('Bearer atlassian-access-1');
    expect(page.findText('Sign in to Jira')).toBeDefined();
    expect(jira.oauth.refreshes()).toEqual([]);

    const signIn = await signInPage(jira);

    expect(signIn.findText(signedInAs(person.email))).toBeUndefined();
    expect(signIn.find(tokenField).props.title).toBe('API token');
    expect(signIn.find(atlassianWords.start).type).toBe('FieldGroup.Link');
  },
  timeoutMs,
);

it(
  'names the person signed in with Atlassian, not the one who pasted a token before',
  async () => {
    const grace = 'grace@example.com';
    const jira = await startWithAtlassian(oauthSettings, grace);

    await fillSignIn({ test: jira.test, jira: jira.jira }, ada);
    expect(
      (await signInPage(jira)).findText(signedInAs(person.email)),
    ).toBeDefined();

    await jira.test.pages.run({
      operation: 'signInWithAtlassian',
      args: {},
      serverDevice: true,
    });

    const signIn = await signInPage(jira);

    const named = async (): Promise<boolean> => {
      await signIn.draw();

      return signIn.findText(signedInAs(grace)) !== undefined;
    };

    expect(
      await jira.test.clock.until(named, { stepMs: 1000, steps: 10 }),
    ).toBe(true);
  },
  timeoutMs,
);
