import { expect, it } from 'vitest';
import { arenaSite, person, sideSite } from './mocks/jira-data';
import { jiraService } from './mocks/jira-service';
import {
  choose,
  firstProject,
  picker,
  projectPage,
  secondProject,
  signIn,
  startJira,
  type,
} from './mocks/journey';

const timeoutMs = 20_000;

const jiraProject = 'Jira project';

const listedIssue = 'Show Jira issues in Argo';

it(
  'chooses the only site, asks which Jira project, and lists its issues with status, priority and assignee',
  async () => {
    const jira = await startJira();

    await signIn(jira);

    const page = await projectPage(jira);

    expect(page.findText('Choose a Jira project')).toBeDefined();
    await choose(page, jiraProject, 'ARGO');

    expect(page.findText(listedIssue)).toBeDefined();
    expect(page.findText('ARGO-3')).toBeDefined();
    expect(page.findText('In Progress')).toBeDefined();
    expect(page.findText('High')).toBeDefined();
    expect(page.findText(person.displayName)).toBeDefined();
    expect(page.findText('Unassigned')).toBeDefined();
  },
  timeoutMs,
);

it(
  'shows an empty project as empty, saying what will show there',
  async () => {
    const jira = await startJira();

    await signIn(jira);

    const page = await projectPage(jira);

    await choose(page, jiraProject, 'QUIET');

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

    await choose(page, jiraProject, 'ARGO');

    expect(page.findText('Couldn’t read Jira')).toBeDefined();
    expect(page.findText('Jira had a problem.')).toBeDefined();

    jira.jira.heal('search');
    await page.press('Try again');

    expect(page.findText(listedIssue)).toBeDefined();
  },
  timeoutMs,
);

it(
  'asks which site a Project uses once there are two, and lists that site’s projects',
  async () => {
    const jira = await startJira([firstProject, secondProject]);

    await signIn(jira);

    // The first Project adds a second site, and uses it; its one Jira project is chosen for it.
    const sitePage = await jira.test.pages.open({
      path: `/projects/${firstProject.id}/site`,
    });

    await type(jira, { page: sitePage, title: 'Site', text: sideSite.host });
    await sitePage.press('Add site');

    expect(
      (await projectPage(jira, firstProject)).findText('A side issue'),
    ).toBeDefined();

    // The second Project has chosen nothing, and two sites are known.
    const second = await projectPage(jira, secondProject);

    expect(second.findText('Choose a Jira site')).toBeDefined();
    await choose(second, 'Site', arenaSite.cloudId);

    expect(second.findText('Choose a Jira project')).toBeDefined();
  },
  timeoutMs,
);

it(
  'lists every Jira project on a site with more than one page of them',
  async () => {
    const service = await jiraService();
    const [arena] = service.data.sites;

    const many = Array.from({ length: 130 }, (_, index) => ({
      id: String(30_000 + index),
      key: `P${index}`,
      name: `Project ${index}`,
      issues: [],
    }));

    arena?.projects.push(...many);

    const jira = await startJira([firstProject], service);

    await signIn(jira);

    const options = (await projectPage(jira)).find(picker(jiraProject)).props
      .options;

    expect(Array.isArray(options) && options.length).toBe(132);
    expect(service.calls('projects')).toHaveLength(2);
  },
  timeoutMs,
);

it(
  'names the site when its project list is gone, and offers no project to forget',
  async () => {
    const jira = await startJira();

    await signIn(jira);
    jira.jira.fail('projects', {
      status: 404,
      json: { errorMessages: ['Site gone.'] },
    });

    const page = await projectPage(jira);

    expect(page.findText('Jira couldn’t find this site')).toBeDefined();
    expect(page.findText('Choose another Jira project')).toBeUndefined();
  },
  timeoutMs,
);
