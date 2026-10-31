import type { Action } from '@repo/contracts/plugins/wire';
import { showToast } from '@repo/kit/primitives/overlays/toast';
import { setStringAsync } from 'expo-clipboard';
import { router } from 'expo-router';
import { Linking } from 'react-native';
import { newSessionHref, sessionHref } from '../navigation/navigation';
import { shareContent } from './share';
import { mayRun } from './web-action';

// Opens a Plugin's page by the path the Plugin registered it at; the App's route for it is the opener's to find.
export type OpenPluginPage = (path: string) => void;

export const pageUnavailable: OpenPluginPage = () =>
  showToast({ title: 'That page is not available', tone: 'danger' });

type Actions = { [Each in Action as Each['action']]: Each };

type Name = keyof Actions;

type Runners = {
  [Each in Name]: (
    action: Actions[Each],
    openPage: OpenPluginPage,
  ) => Promise<void> | void;
};

// One runner per Action, so a new Action fails to compile until the App runs it.
const runners: Runners = {
  toast: ({ message }) => showToast({ title: message, tone: 'success' }),
  navigate: ({ path }, openPage) => openPage(path),
  newSession: ({ projectId, draft }) =>
    router.navigate(newSessionHref(projectId, draft)),
  openSession: ({ sessionId }) => router.navigate(sessionHref(sessionId)),
  openUrl: async ({ url }) => {
    await Linking.openURL(url);
  },
  copy: async ({ text }) => {
    await setStringAsync(text);
  },
  share: shareContent,
  pop: () => router.back(),
};

async function dispatch<Each extends Name>(
  name: Each,
  action: Actions[Each],
  openPage: OpenPluginPage,
): Promise<void> {
  await runners[name](action, openPage);
}

// The built-in Actions run here, in the App, with no round trip to the Server.
export async function runAction(
  action: Action,
  openPage: OpenPluginPage,
): Promise<void> {
  if (mayRun(action)) await dispatch(action.action, action, openPage);
}
