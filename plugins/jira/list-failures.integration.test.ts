import { expect, it } from 'vitest';
import { startJira } from './mocks/journey';
import {
  addIssues,
  argoIssues,
  filterChoice,
  shownKeys,
} from './mocks/listing';

const timeoutMs = 30_000;

const rateLimited = {
  status: 429,
  text: 'Rate limit exceeded.',
};

const failures = [
  {
    name: 'no permission',
    answer: {
      status: 403,
      json: { errorMessages: ['You do not have permission to browse ARGO.'] },
    },
    title: 'Jira refused this',
    message: 'You do not have permission to browse ARGO.',
  },
  {
    name: 'a scoped token without the scope',
    answer: {
      status: 401,
      json: { code: 401, message: 'Unauthorized; scope does not match' },
    },
    title: 'Jira refused this',
    message:
      'Your API token doesn’t have the scopes this needs. Create a token with the Jira scopes on the sign-in page, then sign in with it.',
  },
  {
    name: 'the project gone',
    answer: {
      status: 400,
      json: {
        errorMessages: [
          "The value 'ARGO' does not exist for the field 'project'.",
        ],
      },
    },
    title: 'Jira couldn’t find this project',
    message:
      'This Jira project is gone, or your Atlassian account can no longer see it. Choose another Jira project.',
  },
  {
    name: 'rate limited',
    answer: rateLimited,
    title: 'Jira is busy',
    message: 'Jira is limiting requests right now. Try again in a minute.',
  },
] as const;

it.each(failures)(
  'names Jira’s reason when a filtered list fails: $name',
  async ({ answer, title, message }) => {
    const jira = await startJira();
    const page = await argoIssues(jira);

    jira.jira.fail('search', answer);
    await page.press(filterChoice('To Do'));

    expect(page.findText(title)).toBeDefined();
    expect(page.findText(message)).toBeDefined();
    expect(page.findText('No issues match these filters')).toBeUndefined();

    jira.jira.heal('search');
    await page.press('Try again');

    expect(shownKeys(page)).toEqual(['ARGO-1']);
  },
  timeoutMs,
);

it(
  'names Jira’s reason when a load more fails, and reads that page again when asked',
  async () => {
    const jira = await startJira();

    addIssues(jira, 60);

    const page = await argoIssues(jira);

    jira.jira.fail('search', rateLimited);
    await page.loadMore();

    // The App keeps the rows it shows and says why the draw failed.
    expect(page.error).toContain('Jira is limiting requests right now.');

    // The failed page kept no answer, so asking for it again reads Jira again.
    jira.jira.heal('search');
    await page.draw(2);

    expect(page.error).toBeUndefined();
    expect(shownKeys(page)).toHaveLength(63);
  },
  timeoutMs,
);

it(
  'shows the signed-out page when a filtered read finds the token refused',
  async () => {
    const jira = await startJira();
    const page = await argoIssues(jira);

    jira.jira.data.tokens.splice(0);
    await page.press(filterChoice('Done'));

    expect(page.findText('Sign in to Jira')).toBeDefined();
    expect(page.findText('Jira no longer accepts this sign-in.')).toBeDefined();
  },
  timeoutMs,
);
