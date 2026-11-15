import { expect, it } from 'vitest';
import {
  arenaSite,
  person,
  scopedToken,
  sideSite,
  unscopedToken,
} from './mocks/jira-data';
import {
  ada,
  choose,
  fillSignIn,
  firstProject,
  projectPage,
  secondProject,
  signIn,
  startJira,
  tokenError,
  type,
} from './mocks/journey';
import { notices } from './sign-in-notices';

const timeoutMs = 20_000;

it(
  'signs in by token from the signed-out page, picks a project, and lists its issues',
  async () => {
    const jira = await startJira();
    const signedOut = await projectPage(jira);

    expect(signedOut.findText('Sign in to Jira')).toBeDefined();

    const signInPage = await signedOut.press('Sign in');

    expect(signInPage.path).toBe('/sign-in');
    expect(signInPage.findText('Create an API token')).toBeDefined();

    await fillSignIn(jira, ada, signInPage);

    expect(signInPage.findText(`Signed in as ${person.email}`)).toBeDefined();
    expect(jira.test.accounts.list()).toMatchObject([
      { host: 'api.atlassian.com', label: person.email },
    ]);

    // One site is known, so it is chosen; the site has two Jira projects, so the page asks which.
    const page = await projectPage(jira);

    expect(page.findText('Choose a Jira project')).toBeDefined();
    await choose(page, 'Jira project', 'ARGO');

    expect(page.findText('Show Jira issues in Argo')).toBeDefined();
    expect(page.findText('ARGO-3')).toBeDefined();
    expect(page.findText('In Progress')).toBeDefined();
    expect(page.findText('High')).toBeDefined();
    expect(page.findText(person.displayName)).toBeDefined();
    expect(page.findText('Unassigned')).toBeDefined();
    expect(await jira.test.log()).not.toContain(scopedToken);
  },
  timeoutMs,
);

it(
  'sends the token to Jira as Basic over the email, through Atlassian’s gateway for the site’s cloud',
  async () => {
    const jira = await startJira();

    await signIn(jira);

    const [check] = jira.jira.calls('myself');
    const basic = Buffer.from(`${person.email}:${scopedToken}`).toString(
      'base64',
    );

    expect(check?.host).toBe('api.atlassian.com');
    expect(check?.path).toBe(`/ex/jira/${arenaSite.cloudId}/rest/api/3/myself`);
    expect(check?.headers.authorization).toBe(`Basic ${basic}`);
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
  'shows an empty project as empty, saying what will show there',
  async () => {
    const jira = await startJira();

    await signIn(jira);

    const page = await projectPage(jira);

    await choose(page, 'Jira project', 'QUIET');

    expect(page.findText('No issues in QUIET')).toBeDefined();
  },
  timeoutMs,
);

it(
  'shows a failed read with Jira’s reason, and reads again on Try again',
  async () => {
    const jira = await startJira();

    await signIn(jira);
    jira.jira.fail('search', {
      status: 500,
      json: { errorMessages: ['Jira had a problem.'] },
    });

    const page = await projectPage(jira);

    await choose(page, 'Jira project', 'ARGO');

    expect(page.findText('Couldn’t read Jira')).toBeDefined();
    expect(page.findText('Jira had a problem.')).toBeDefined();

    jira.jira.heal('search');
    await page.press('Try again');

    expect(page.findText('Show Jira issues in Argo')).toBeDefined();
  },
  timeoutMs,
);

it(
  'goes back to the signed-out page when Jira stops accepting the token',
  async () => {
    const jira = await startJira();

    await signIn(jira);

    const page = await projectPage(jira);

    await choose(page, 'Jira project', 'ARGO');
    expect(page.findText('Show Jira issues in Argo')).toBeDefined();

    // Revoked at Atlassian: the page notices on its next read, within a minute.
    jira.jira.data.tokens.splice(0);
    await jira.test.clock.advance(60_000);
    await page.draw();

    expect(page.findText('Sign in to Jira')).toBeDefined();
    expect(page.findText('Jira no longer accepts this sign-in.')).toBeDefined();
  },
  timeoutMs,
);

it(
  'asks which site a Project uses once there are two, and lists that site’s projects',
  async () => {
    const jira = await startJira([firstProject, secondProject]);

    await signIn(jira);

    // The first Project adds a second site, and uses it.
    const sitePage = await jira.test.pages.open({
      path: `/projects/${firstProject.id}/site`,
    });

    await type(jira, sitePage, 'Site', sideSite.host);
    await sitePage.press('Add site');

    const first = await projectPage(jira, firstProject);

    expect(first.findText('A side issue')).toBeDefined();

    // The second Project has chosen nothing, and two sites are known.
    const second = await projectPage(jira, secondProject);

    expect(second.findText('Choose a Jira site')).toBeDefined();
    await choose(second, 'Site', arenaSite.cloudId);

    expect(second.findText('Choose a Jira project')).toBeDefined();
  },
  timeoutMs,
);
