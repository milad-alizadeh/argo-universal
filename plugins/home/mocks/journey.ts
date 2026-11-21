import { fileURLToPath } from 'node:url';
import {
  clockUntilShown,
  startPluginTest,
  type OpenPage,
  type PluginTest,
} from '@argo/plugin-kit/testing';
import { expect, onTestFinished } from 'vitest';
import { homeWords } from '../home-words';
import { appSettings, grantedCode } from './hue-data';
import { hueService, type HueService } from './hue-service';

export const homeAgent = { projectId: 'project-1', sessionId: 'session-1' };

/*
 * The Home Plugin over a fixture Hue cloud, with the person's Remote API app set in its secret Settings unless a test
 * says otherwise. A browser that approves at once stands in for the person. The Project and Session let an Agent
 * call Operations, while the Home page is drawn without a Project.
 */
export type HomeJourney = { test: PluginTest; hue: HueService; opened: URL[] };

const plugin = {
  directory: fileURLToPath(new URL('..', import.meta.url)),
  pluginId: 'home',
  version: '0.0.1',
};

const param = (url: URL, name: string): string =>
  url.searchParams.get(name) ?? '';

// The person allows the app, so Hue sends the browser back to Argo's callback with a code.
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

export async function startHome(
  settings: Map<string, string> = appSettings,
): Promise<HomeJourney> {
  const hue = await hueService();
  const opened: URL[] = [];

  const test = await startPluginTest({
    ...plugin,
    network: hue.network,
    projects: [
      { id: homeAgent.projectId, name: 'Home tests', originUrl: null },
    ],
    projectPaths: { [homeAgent.projectId]: plugin.directory },
    sessions: {
      [homeAgent.sessionId]: {
        projectId: homeAgent.projectId,
        branch: null,
        title: 'Home tests',
      },
    },
    openBrowser: approving(opened),
    settings: new Map(settings),
    clockStart: 0,
  });

  onTestFinished(() => test.close());

  return { test, hue, opened };
}

const pace = { stepMs: 1000, steps: 10 };

// Signs in from the sign-in page on the Server Device, as the person's first press does.
export async function signIn({ test }: HomeJourney): Promise<void> {
  const page = await test.pages.open({ path: '/sign-in', serverDevice: true });

  await page.press(`Sign in to ${homeWords.service}`);
  expect(
    await clockUntilShown(test, page, { text: 'Connected', ...pace }),
  ).toBe(true);
}

// The authorize URL the browser was first sent to, as Hue receives it.
export function firstAuthorize({ opened }: HomeJourney): URL {
  const [authorize] = opened;

  if (!authorize) throw new Error('The browser was never opened.');

  return authorize;
}

export const homePage = ({ test }: HomeJourney): Promise<OpenPage> =>
  test.pages.open({ path: '/', serverDevice: true });

// Signed in, with the Bridge connected: the page lists the household's lights.
export async function connected(home: HomeJourney): Promise<OpenPage> {
  await signIn(home);
  const page = await homePage(home);

  return page.press(homeWords.connectButton);
}
