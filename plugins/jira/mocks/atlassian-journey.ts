import { fileURLToPath } from 'node:url';
import {
  clockUntilShown,
  startPluginTest,
  type OpenPage,
  type PluginTest,
  type PluginTestOptions,
  type WireNode,
} from '@argo/plugin-kit/testing';
import { expect, onTestFinished } from 'vitest';
import { atlassianWords } from '../atlassian-words';
import {
  atlassianOAuth,
  grantedCode,
  oauthSettings,
  type AtlassianOAuth,
} from './atlassian-oauth';
import { person } from './jira-data';
import { jiraService, type JiraService } from './jira-service';
import { choose, firstProject } from './journey';

/*
 * The Jira Plugin over a fixture Jira and Atlassian's OAuth, with the person's OAuth app set in the Plugin's secret
 * Settings unless a test says otherwise. A browser that approves at once stands in for the person.
 */
export type AtlassianJira = {
  test: PluginTest;
  jira: JiraService;
  oauth: AtlassianOAuth;
  // The authorize URLs the browser was sent to.
  opened: URL[];
};

const plugin = {
  directory: fileURLToPath(new URL('..', import.meta.url)),
  pluginId: 'jira',
  version: '0.0.0',
};

const param = (url: URL, name: string): string =>
  url.searchParams.get(name) ?? '';

// The person allows the app, so Atlassian sends the browser back to Argo's callback with a code.
const approving =
  (opened: URL[]) =>
  async (url: string): Promise<void> => {
    const authorize = new URL(url);
    const back = new URL(param(authorize, 'redirect_uri'));

    opened.push(authorize);
    back.searchParams.set('state', param(authorize, 'state'));
    back.searchParams.set('code', grantedCode);
    await fetch(back);
  };

type Started = {
  jira: JiraService;
  opened: URL[];
  settings: Map<string, string>;
};

// The Plugin's clock only moves when the test moves it.
const optionsOf = ({ jira, opened, settings }: Started): PluginTestOptions => ({
  ...plugin,
  projects: [firstProject],
  network: jira.network,
  openBrowser: approving(opened),
  settings: new Map(settings),
  clockStart: 0,
});

async function started(given: Started): Promise<PluginTest> {
  const test = await startPluginTest(optionsOf(given));

  onTestFinished(() => test.close());

  return test;
}

export async function startWithAtlassian(
  settings: Map<string, string> = oauthSettings,
): Promise<AtlassianJira> {
  const oauth = atlassianOAuth();
  const jira = await jiraService({ oauth });
  const opened: URL[] = [];

  return {
    test: await started({ jira, opened, settings }),
    jira,
    oauth,
    opened,
  };
}

// The sign-in page as the App on the Server Device draws it, or a paired Device's when `serverDevice` is false.
export const signInPage = (
  { test }: AtlassianJira,
  serverDevice = true,
): Promise<OpenPage> => test.pages.open({ path: '/sign-in', serverDevice });

// Presses "Sign in with Atlassian" and waits for the browser to come back, as the page shows.
export async function signInWithAtlassian(
  jira: AtlassianJira,
  page?: OpenPage,
): Promise<OpenPage> {
  const signIn = page ?? (await signInPage(jira));

  await signIn.press(atlassianWords.start);
  await clockUntilShown(jira.test, signIn, {
    text: `Signed in as ${person.email}`,
    stepMs: 1000,
    steps: 10,
  });
  expect(signIn.findText(`Signed in as ${person.email}`)).toBeDefined();

  return signIn;
}

export const projectPage = (
  { test }: AtlassianJira,
  serverDevice = false,
): Promise<OpenPage> =>
  test.pages.open({ path: `/projects/${firstProject.id}`, serverDevice });

// The Authorization header of each read that reached Jira's issue search.
const searchCredentials = ({ jira }: AtlassianJira): string[] =>
  jira.calls('search').map(({ headers }) => String(headers.authorization));

// The Authorization header the last read of Jira's issue search carried.
export const lastCredential = (jira: AtlassianJira): string =>
  searchCredentials(jira).at(-1) ?? '';

export const issueSummary = 'Show Jira issues in Argo';

// The project page with its Jira project chosen, listing that project's issues.
export async function issuesShown(jira: AtlassianJira): Promise<OpenPage> {
  const page = await projectPage(jira);

  await choose(page, 'Jira project', 'ARGO');
  expect(page.findText(issueSummary)).toBeDefined();

  return page;
}

// The authorize URL the browser was first sent to, as Atlassian receives it.
export function firstAuthorize({ opened }: AtlassianJira): URL {
  const [authorize] = opened;

  if (!authorize) throw new Error('The browser was never opened.');

  return authorize;
}

const signedInWithAtlassian = (jira: AtlassianJira): boolean =>
  lastCredential(jira).startsWith('Bearer ');

// Draws the project page until its reads go out with the OAuth token, as a sign-in's `argo.changed()` makes them.
export async function readsAsBearer(jira: AtlassianJira): Promise<boolean> {
  const page = await projectPage(jira);

  return jira.test.clock.until(
    async () => {
      await page.draw();

      return signedInWithAtlassian(jira);
    },
    { stepMs: 1000, steps: 10 },
  );
}

// The footer the "Sign in with Atlassian" section shows, which says why its row holds still or what it does.
const isAtlassianSection = (node: WireNode): boolean =>
  node.type === 'FieldGroup.Section' &&
  node.props.title === atlassianWords.section;

export function atlassianFooter(page: OpenPage): string {
  const { footer } = page.find(isAtlassianSection).props;

  return typeof footer === 'string' ? footer : '';
}
