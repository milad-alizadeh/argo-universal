import type { Action } from '@repo/contracts/plugins/wire';
import { showToast } from '@repo/kit/primitives/overlays/toast';
import { setStringAsync } from 'expo-clipboard';
import { router, type Href } from 'expo-router';
import { Linking } from 'react-native';
import { newSessionHref } from '../navigation/navigation';
import { shareContent } from './share';
import { mayRun } from './web-action';

// A Plugin opens its own pages: `/plugins/<Plugin id>/<nav id>/<page>`.
function pluginHref(path: string): Href | null {
  const [root, ...page] = path.split('/').filter(Boolean);

  return root === 'plugins' && page.length > 0
    ? { pathname: '/plugins/[...path]', params: { path: page } }
    : null;
}

function openPage(path: string): void {
  const href = pluginHref(path);

  if (href) router.push(href);
  else showToast({ title: 'That page is not available', tone: 'danger' });
}

type Actions = { [Each in Action as Each['action']]: Each };

type Name = keyof Actions;

type Runners = {
  [Each in Name]: (action: Actions[Each]) => Promise<void> | void;
};

// One runner per Action, so a new Action fails to compile until the App runs it.
const runners: Runners = {
  toast: ({ message }) => showToast({ title: message, tone: 'success' }),
  navigate: ({ path }) => openPage(path),
  newSession: ({ projectId, draft }) =>
    router.navigate(newSessionHref(projectId, draft)),
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
): Promise<void> {
  await runners[name](action);
}

// The built-in Actions run here, in the App, with no round trip to the Server.
export async function runAction(action: Action): Promise<void> {
  if (mayRun(action)) await dispatch(action.action, action);
}
