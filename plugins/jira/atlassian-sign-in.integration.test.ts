import { serialiseOnOAuthPort } from '@argo/plugin-kit/testing/oauth-port';
import { expect, it } from 'vitest';
import { atlassianWords } from './atlassian-words';
import {
  projectPage,
  searchCredentials,
  signInPage,
  signInWithAtlassian,
  startWithAtlassian,
} from './mocks/atlassian-journey';
import {
  oauthClient,
  oauthSettings,
  tokenLifetimeMs,
} from './mocks/atlassian-oauth';
import { arenaSite, person, scopedToken } from './mocks/jira-data';
import { ada, fillSignIn } from './mocks/journey';

serialiseOnOAuthPort();

const timeoutMs = 30_000;

const issueSummary = 'Show Jira issues in Argo';

// A Jira project to show, chosen on the project page, which lists its issues.
async function issuesShown(
  jira: Awaited<ReturnType<typeof startWithAtlassian>>,
) {
  const page = await projectPage(jira);

  await page.act(
    (node) =>
      node.type === 'FieldGroup.Picker' && node.props.title === 'Jira project',
    'onValueChange',
    'ARGO',
  );
  expect(page.findText(issueSummary)).toBeDefined();

  return page;
}

it(
  'points to the Plugin’s settings, under the token paste, until the OAuth app’s client ID and secret are both set',
  async () => {
    const onlyId = new Map([['oauth-client-id', oauthClient.id]]);
    const jira = await startWithAtlassian(onlyId);
    const page = await signInPage(jira);

    expect(page.findText(atlassianWords.needsApp)).toBeDefined();
    expect(page.findText(atlassianWords.start)).toBeUndefined();
    expect(page.findText('Create an API token')).toBeDefined();
  },
  timeoutMs,
);

it(
  'signs in with Atlassian on the Server Device, with the client secret, and lists issues as Bearer',
  async () => {
    const jira = await startWithAtlassian();
    const page = await signInPage(jira);

    // The token paste stays the default, with "Sign in with Atlassian" offered under it.
    expect(page.findText('Create an API token')).toBeDefined();
    await signInWithAtlassian(jira, page);

    const [authorize] = jira.opened;

    expect(authorize?.origin + (authorize?.pathname ?? '')).toBe(
      'https://auth.atlassian.com/authorize',
    );
    expect(Object.fromEntries(authorize?.searchParams ?? [])).toMatchObject({
      audience: 'api.atlassian.com',
      prompt: 'consent',
      client_id: oauthClient.id,
      redirect_uri: 'http://127.0.0.1:51789/callback',
      scope: 'read:jira-work read:jira-user write:jira-work offline_access',
    });
    expect(authorize?.searchParams.has('client_secret')).toBe(false);
    expect(jira.oauth.forms()[0]?.get('client_secret')).toBe(
      oauthClient.secret,
    );
    expect(jira.test.accounts.list()).toMatchObject([
      { host: 'api.atlassian.com', label: person.email },
    ]);

    // The token reaches one Jira site, which is chosen; the Confluence site it also reaches is not one.
    await issuesShown(jira);
    expect(searchCredentials(jira).at(-1)).toBe('Bearer atlassian-access-1');
    expect(jira.jira.calls('search')[0]?.path).toBe(
      `/ex/jira/${arenaSite.cloudId}/rest/api/3/search/jql`,
    );

    const log = await jira.test.log();

    expect(log).not.toContain(oauthClient.secret);
    expect(log).not.toContain(oauthClient.id);
    expect(JSON.stringify(page.tree)).not.toContain(oauthClient.secret);
  },
  timeoutMs,
);

it(
  'refreshes the hour-long token with the client secret, keeping each rotated refresh token',
  async () => {
    const jira = await startWithAtlassian();

    await signInWithAtlassian(jira);
    const page = await issuesShown(jira);

    await jira.test.clock.advance(tokenLifetimeMs);
    await page.draw();
    expect(searchCredentials(jira).at(-1)).toBe('Bearer atlassian-access-2');

    await jira.test.clock.advance(tokenLifetimeMs);
    await page.draw();
    expect(searchCredentials(jira).at(-1)).toBe('Bearer atlassian-access-3');

    expect(
      jira.oauth.refreshes().map((form) => Object.fromEntries(form)),
    ).toEqual([
      {
        grant_type: 'refresh_token',
        client_id: oauthClient.id,
        client_secret: oauthClient.secret,
        refresh_token: 'atlassian-refresh-1',
      },
      {
        grant_type: 'refresh_token',
        client_id: oauthClient.id,
        client_secret: oauthClient.secret,
        refresh_token: 'atlassian-refresh-2',
      },
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

    // Signing in again rewrites the same Account's token.
    await signInWithAtlassian(jira);
    await page.draw();
    expect(page.findText(issueSummary)).toBeDefined();
    expect(jira.test.accounts.list()).toHaveLength(1);
  },
  timeoutMs,
);

it(
  'tells a paired phone to continue on the Server Device or paste a token, and starts nothing there',
  async () => {
    const jira = await startWithAtlassian();
    const phone = await signInPage(jira, false);

    expect(phone.findText(atlassianWords.elsewhere)).toBeDefined();
    expect(phone.findText(atlassianWords.start)).toBeUndefined();
    expect(phone.findText('Create an API token')).toBeDefined();

    await expect(
      jira.test.pages.run({ operation: 'signInWithAtlassian', args: {} }),
    ).resolves.toMatchObject({ result: { state: 'failed' } });
    expect(jira.opened).toEqual([]);
  },
  timeoutMs,
);

it(
  'rewrites the token-signed-in Account when the same person signs in with Atlassian',
  async () => {
    const jira = await startWithAtlassian(oauthSettings);

    await fillSignIn({ test: jira.test, jira: jira.jira }, ada);
    await issuesShown(jira);
    expect(searchCredentials(jira).at(-1)).toMatch(/^Basic /);

    // The page shows the token sign-in now, so an Agent, or a later visit, starts Atlassian's.
    await jira.test.pages.run({
      operation: 'signInWithAtlassian',
      args: {},
      serverDevice: true,
    });

    const page = await projectPage(jira);
    const bearer = async (): Promise<boolean> => {
      await page.draw();

      return searchCredentials(jira).at(-1)?.startsWith('Bearer ') === true;
    };

    expect(
      await jira.test.clock.until(bearer, { stepMs: 1000, steps: 10 }),
    ).toBe(true);
    expect(jira.test.accounts.list()).toMatchObject([
      { host: 'api.atlassian.com', label: person.email },
    ]);
    expect(searchCredentials(jira).at(-1)).toMatch(/^Bearer /);
    expect(await jira.test.log()).not.toContain(scopedToken);
  },
  timeoutMs,
);
