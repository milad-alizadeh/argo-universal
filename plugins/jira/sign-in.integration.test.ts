import { expect, it } from 'vitest';
import {
  arenaSite,
  person,
  scopedToken,
  unscopedToken,
} from './mocks/jira-data';
import {
  ada,
  fillSignIn,
  projectPage,
  signIn,
  startJira,
  tokenError,
} from './mocks/journey';
import { notices } from './sign-in-notices';

const timeoutMs = 20_000;

const signedInAs = `Signed in as ${person.email}`;

it(
  'signs in by token from the signed-out page, on a paired Device, and adds the Account',
  async () => {
    const jira = await startJira();
    const signedOut = await projectPage(jira);

    expect(signedOut.findText('Sign in to Jira')).toBeDefined();

    const page = await signedOut.press('Sign in');

    expect(page.path).toBe('/sign-in');
    expect(page.findText('Create an API token')).toBeDefined();

    await fillSignIn(jira, ada, page);

    expect(page.findText(signedInAs)).toBeDefined();
    expect(jira.test.accounts.list()).toMatchObject([
      { host: 'api.atlassian.com', label: person.email },
    ]);
    expect(await jira.test.log()).not.toContain(scopedToken);
  },
  timeoutMs,
);

it(
  'checks the token as Basic over the email, through Atlassian’s gateway for the site’s cloud',
  async () => {
    const jira = await startJira();

    await signIn(jira);

    const basic = Buffer.from(`${person.email}:${scopedToken}`).toString(
      'base64',
    );

    expect(jira.jira.calls('myself')).toMatchObject([
      {
        host: 'api.atlassian.com',
        path: `/ex/jira/${arenaSite.cloudId}/rest/api/3/myself`,
        headers: { authorization: `Basic ${basic}` },
      },
    ]);
  },
  timeoutMs,
);

it(
  'refuses an unscoped API token, saying why',
  async () => {
    const jira = await startJira();
    const page = await fillSignIn(jira, { ...ada, token: unscopedToken });

    expect(tokenError(page)).toBe(notices.unscoped);
    expect(jira.test.accounts.list()).toEqual([]);
  },
  timeoutMs,
);

it(
  'refuses a token Atlassian does not know, and a site that is not Jira',
  async () => {
    const jira = await startJira();
    const page = await fillSignIn(jira, { ...ada, token: 'ATATT-wrong-0000' });

    expect(tokenError(page)).toBe(notices.refused);

    await fillSignIn(jira, { ...ada, site: 'nowhere.atlassian.net' }, page);

    expect(tokenError(page)).toBe(notices.noSite('nowhere.atlassian.net'));
    expect(jira.test.accounts.list()).toEqual([]);
  },
  timeoutMs,
);

it(
  'never keeps the token or its Basic credential in Page state, the drawn page or the run’s answer',
  async () => {
    const jira = await startJira();
    const page = await fillSignIn(jira, ada);

    const credential = Buffer.from(`${person.email}:${scopedToken}`).toString(
      'base64',
    );

    const answer = await jira.test.pages.run({
      operation: 'signIn',
      args: { email: ada.email, site: ada.site, token: scopedToken },
    });

    for (const kept of [page.pageState, page.tree, answer]) {
      expect(JSON.stringify(kept)).not.toContain(scopedToken);
      expect(JSON.stringify(kept)).not.toContain(credential);
    }
  },
  timeoutMs,
);
