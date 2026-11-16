import { serialiseOnOAuthPort } from '@argo/plugin-kit/testing/oauth-port';
import { expect, it } from 'vitest';
import {
  issueSummary,
  issuesShown,
  lastCredential,
  projectPage,
  readsAsBearer,
  signInWithAtlassian,
  startWithAtlassian,
} from './mocks/atlassian-journey';
import { oauthClient, tokenLifetimeMs } from './mocks/atlassian-oauth';
import { person, scopedToken } from './mocks/jira-data';
import { ada, fillSignIn } from './mocks/journey';

serialiseOnOAuthPort();

const timeoutMs = 30_000;

// RFC 6749 section 6, with the client secret Atlassian requires.
type RefreshForm = {
  grant_type: 'refresh_token';
  client_id: string;
  client_secret: string;
  refresh_token: string;
};

const refreshOf = (refreshToken: string): RefreshForm => ({
  grant_type: 'refresh_token',
  client_id: oauthClient.id,
  client_secret: oauthClient.secret,
  refresh_token: refreshToken,
});

it(
  'refreshes the hour-long token with the client secret, keeping each rotated refresh token',
  async () => {
    const jira = await startWithAtlassian();

    await signInWithAtlassian(jira);
    const page = await issuesShown(jira);

    await jira.test.clock.advance(tokenLifetimeMs);
    await page.draw();
    expect(lastCredential(jira)).toBe('Bearer atlassian-access-2');

    await jira.test.clock.advance(tokenLifetimeMs);
    await page.draw();
    expect(lastCredential(jira)).toBe('Bearer atlassian-access-3');

    expect(
      jira.oauth.refreshes().map((form) => Object.fromEntries(form)),
    ).toEqual([
      refreshOf('atlassian-refresh-1'),
      refreshOf('atlassian-refresh-2'),
    ]);
    expect(page.findText(issueSummary)).toBeDefined();
  },
  timeoutMs,
);

it(
  'asks the person to sign in again when Atlassian refuses an expired refresh token, and spends it once',
  async () => {
    const jira = await startWithAtlassian();

    await signInWithAtlassian(jira);
    await issuesShown(jira);

    jira.oauth.revoke();
    await jira.test.clock.advance(tokenLifetimeMs);

    const page = await projectPage(jira);

    expect(page.findText('Sign in to Jira')).toBeDefined();
    await page.draw();
    expect(jira.oauth.refreshes()).toHaveLength(1);

    // The sign-in page offers Atlassian again, and signing in rewrites the same Account's token.
    await signInWithAtlassian(jira);
    await page.draw();
    expect(page.findText(issueSummary)).toBeDefined();
    expect(jira.test.accounts.list()).toHaveLength(1);
  },
  timeoutMs,
);

it(
  'rewrites the token-signed-in Account when the same person signs in with Atlassian',
  async () => {
    const jira = await startWithAtlassian();

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
    expect(jira.test.accounts.list()).toMatchObject([
      { host: 'api.atlassian.com', label: person.email },
    ]);
    expect(await jira.test.log()).not.toContain(scopedToken);
  },
  timeoutMs,
);
