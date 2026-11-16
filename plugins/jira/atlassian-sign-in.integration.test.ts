import { serialiseOnOAuthPort } from '@argo/plugin-kit/testing/oauth-port';
import { expect, it } from 'vitest';
import { atlassianWords } from './atlassian-words';
import {
  atlassianFooter,
  firstAuthorize,
  issuesShown,
  lastCredential,
  signInPage,
  signInWithAtlassian,
  startWithAtlassian,
} from './mocks/atlassian-journey';
import { oauthClient } from './mocks/atlassian-oauth';
import { arenaSite, person } from './mocks/jira-data';

serialiseOnOAuthPort();

const timeoutMs = 30_000;

const tokenLink = 'Create an API token';

it(
  'points to the Plugin’s settings, under the token paste, until the OAuth app’s client ID and secret are both set',
  async () => {
    const onlyId = new Map([['oauth-client-id', oauthClient.id]]);
    const page = await signInPage(await startWithAtlassian(onlyId));

    expect(atlassianFooter(page)).toBe(atlassianWords.needsApp);
    expect(page.find(atlassianWords.start).props.disabled).toBe(true);
    expect(page.findText(tokenLink)).toBeDefined();
  },
  timeoutMs,
);

it(
  'sends the browser to Atlassian with its audience, the app’s client ID and offline_access, never the secret',
  async () => {
    const jira = await startWithAtlassian();
    const page = await signInPage(jira);

    // The token paste stays the default, with "Sign in with Atlassian" offered under it.
    expect(page.findText(tokenLink)).toBeDefined();
    expect(page.find(atlassianWords.start).props.disabled).toBe(false);
    await signInWithAtlassian(jira, page);

    const authorize = firstAuthorize(jira);

    expect(`${authorize.origin}${authorize.pathname}`).toBe(
      'https://auth.atlassian.com/authorize',
    );
    expect(Object.fromEntries(authorize.searchParams)).toMatchObject({
      audience: 'api.atlassian.com',
      prompt: 'consent',
      client_id: oauthClient.id,
      redirect_uri: 'http://127.0.0.1:51789/callback',
      scope: 'read:jira-work read:jira-user write:jira-work offline_access',
    });
    expect(authorize.searchParams.has('client_secret')).toBe(false);
  },
  timeoutMs,
);

it(
  'exchanges the code with the client secret, adds the api.atlassian.com Account, and lists issues as Bearer',
  async () => {
    const jira = await startWithAtlassian();
    const page = await signInWithAtlassian(jira);

    expect(jira.oauth.forms()[0]?.get('client_secret')).toBe(
      oauthClient.secret,
    );
    expect(jira.test.accounts.list()).toMatchObject([
      { host: 'api.atlassian.com', label: person.email },
    ]);

    // The token reaches one Jira site, which is chosen; the Confluence site it also reaches is not one.
    await issuesShown(jira);
    expect(lastCredential(jira)).toBe('Bearer atlassian-access-1');
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
  'tells a paired phone to continue on the Server Device or paste a token, and starts nothing there',
  async () => {
    const jira = await startWithAtlassian();
    const phone = await signInPage(jira, false);

    expect(atlassianFooter(phone)).toBe(atlassianWords.elsewhere);
    expect(phone.find(atlassianWords.start).props.disabled).toBe(true);
    expect(phone.findText(tokenLink)).toBeDefined();

    await expect(
      jira.test.pages.run({ operation: 'signInWithAtlassian', args: {} }),
    ).resolves.toMatchObject({ result: { state: 'failed' } });
    expect(jira.opened).toEqual([]);
  },
  timeoutMs,
);
