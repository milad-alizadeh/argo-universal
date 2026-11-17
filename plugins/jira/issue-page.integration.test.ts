import { expect, it } from 'vitest';
import { fieldKeys } from './issue-keys';
import {
  argoThree,
  argoThreePath,
  keyed,
  listed,
  run,
  shown,
} from './mocks/issue-journey';
import { arenaSite, person } from './mocks/jira-data';
import { argoThreeMarkdown } from './mocks/jira-descriptions';
import { richMarkdown } from './mocks/jira-rich-description';
import { firstProject, signIn, startJira } from './mocks/journey';

const timeoutMs = 20_000;

const issuePage = (key: string): string =>
  `/projects/${firstProject.id}/issues/${key}`;

it(
  'opens an issue from its row and draws it at once from what the list read',
  async () => {
    const jira = await listed();
    const asked = jira.jira.requests.length;
    const page = await jira.list.press(argoThree);

    expect(page.path).toBe(argoThreePath);
    // Jira is asked nothing: the row seeded the issue, and the list read what the menus offer.
    expect(jira.jira.requests).toHaveLength(asked);
    expect(page.findText(argoThree)).toBeDefined();
    expect(shown(page)).toEqual({
      status: 'In Progress',
      assignee: person.displayName,
      priority: 'High',
    });
    expect(page.find(keyed(fieldKeys.status)).props.dot).toBe('info');
    expect(
      page.find(
        (node) =>
          node.type === 'FieldGroup.Value' && node.props.title === 'Labels',
      ).props.value,
    ).toContain('spec-0027');
    expect(
      page.find((node) => node.type === 'FieldGroup.Link').props,
    ).toMatchObject({
      value: 'ARGO-3',
      onPress: {
        action: 'openUrl',
        url: `https://${arenaSite.host}/browse/ARGO-3`,
      },
    });
    expect(page.find((node) => node.type === 'Detail').props.markdown).toBe(
      argoThreeMarkdown,
    );
  },
  timeoutMs,
);

it(
  'draws every kind of description Jira writes, from what the list asked for',
  async () => {
    const jira = await listed();
    const page = await jira.list.press('Sign in with a scoped API token');

    expect(jira.jira.calls('issue')).toEqual([]);
    expect(page.find((node) => node.type === 'Detail').props.markdown).toBe(
      richMarkdown,
    );
  },
  timeoutMs,
);

it(
  'never draws a loading state for what the row showed',
  async () => {
    const jira = await listed();
    const page = await jira.list.press(argoThree);
    const drawn = JSON.stringify(page.tree);

    expect(drawn).not.toContain('Loading');
    expect(drawn).not.toContain('"Spinner"');
    expect(drawn).not.toContain('isLoading');
  },
  timeoutMs,
);

it(
  'reads an issue opened by its address, with no list before it, from Jira',
  async () => {
    const jira = await startJira();

    await signIn(jira);
    await run(jira, 'chooseProject', {
      cloudId: arenaSite.cloudId,
      key: 'ARGO',
    });

    const page = await jira.test.pages.open({ path: issuePage('ARGO-2') });

    expect(page.findText('Sign in with a scoped API token')).toBeDefined();
    expect(shown(page).status).toBe('Done');
    expect(jira.jira.calls('issue')).toHaveLength(1);
  },
  timeoutMs,
);

it(
  'says Jira cannot find an issue, with Jira’s reason and Try again',
  async () => {
    const jira = await listed();
    const page = await jira.test.pages.open({ path: issuePage('ARGO-99') });

    expect(page.findText('Jira couldn’t find this issue')).toBeDefined();
    expect(page.findText('Try again')).toBeDefined();
  },
  timeoutMs,
);

it(
  'says to sign in when Jira stops accepting the token',
  async () => {
    const jira = await listed();

    const page = await jira.list.press(argoThree);

    // Revoked at Atlassian: the page notices on its next read, within a minute.
    jira.jira.data.tokens.splice(0);
    await jira.test.clock.advance(60_000);
    await page.draw();

    expect(page.findText('Sign in to Jira')).toBeDefined();
    expect(page.find('Sign in').props.onPress).toMatchObject({
      action: 'navigate',
    });
  },
  timeoutMs,
);
