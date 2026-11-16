import { fileURLToPath } from 'node:url';
import {
  startPluginTest,
  type OpenPage,
  type PluginTest,
  type WireNode,
} from '@argo/plugin-kit/testing';
import { expect, onTestFinished } from 'vitest';
import { arenaSite, person, scopedToken } from './jira-data';
import { jiraService, type JiraService } from './jira-service';

type FixtureProject = { id: string; name: string; originUrl: string | null };

export const firstProject: FixtureProject = {
  id: 'project-1',
  name: 'Fixture Project',
  originUrl: null,
};

export const secondProject: FixtureProject = {
  id: 'project-2',
  name: 'Second Project',
  originUrl: null,
};

export type Jira = { test: PluginTest; jira: JiraService };

const plugin = {
  directory: fileURLToPath(new URL('..', import.meta.url)),
  pluginId: 'jira',
  version: '0.0.0',
};

// The Plugin over a fixture Jira, not signed in; its clock only moves when the test moves it.
export async function startJira(
  projects = [firstProject],
  jira?: JiraService,
): Promise<Jira> {
  const service = jira ?? (await jiraService());

  const test = await startPluginTest({
    ...plugin,
    projects,
    network: service.network,
    clockStart: 0,
  });

  onTestFinished(() => test.close());

  return { test, jira: service };
}

// A bound field lands once typing pauses, and a SecretField sends its text then too.
const editPauseMs = 300;

const field =
  (type: string, title: string) =>
  (node: WireNode): boolean =>
    node.type === type && node.props.title === title;

const textField = (title: string): ((node: WireNode) => boolean) =>
  field('FieldGroup.TextField', title);

export const picker = (title: string): ((node: WireNode) => boolean) =>
  field('FieldGroup.Picker', title);

// Types into a field as a person does, and waits for the pause that lands it.
type Typing = { page: OpenPage; title: string; text: string };

export async function type(
  { test }: Jira,
  { page, title, text }: Typing,
): Promise<void> {
  await page.act(textField(title), 'onChangeText', text);
  await test.clock.advance(editPauseMs);
}

const secretField = field('FieldGroup.SecretField', 'API token');

// Why the last pasted token was not used, as the field shows it.
export function tokenError(page: OpenPage): string | undefined {
  const { error } = page.find(secretField).props;

  return typeof error === 'string' ? error : undefined;
}

async function pasteToken(
  { test }: Jira,
  page: OpenPage,
  token: string,
): Promise<void> {
  await page.act(secretField, 'onChangeText', token);
  await test.clock.advance(editPauseMs);
}

export type Credentials = { email: string; site: string; token: string };

export const ada: Credentials = {
  email: person.email,
  site: arenaSite.host,
  token: scopedToken,
};

// The sign-in page with the email and site typed and the token pasted, as a person fills it.
export async function fillSignIn(
  jira: Jira,
  credentials: Credentials,
  page?: OpenPage,
): Promise<OpenPage> {
  const signIn = page ?? (await jira.test.pages.open({ path: '/sign-in' }));

  await type(jira, { page: signIn, title: 'Email', text: credentials.email });
  await type(jira, { page: signIn, title: 'Site', text: credentials.site });
  await pasteToken(jira, signIn, credentials.token);

  return signIn;
}

export async function signIn(jira: Jira): Promise<void> {
  const page = await fillSignIn(jira, ada);

  expect(page.findText(`Signed in as ${person.email}`)).toBeDefined();
}

export const projectPage = (
  { test }: Jira,
  project = firstProject,
): Promise<OpenPage> => test.pages.open({ path: `/projects/${project.id}` });

// Chooses one option of a picker on the page, as a person taps it.
export async function choose(
  page: OpenPage,
  title: string,
  value: string,
): Promise<void> {
  await page.act(picker(title), 'onValueChange', value);
}
