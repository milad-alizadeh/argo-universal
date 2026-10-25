import type { Action } from '@repo/contracts/plugins/wire';
import { showToast } from '@repo/kit/primitives/overlays/toast';
import { setStringAsync } from 'expo-clipboard';
import { router, type Href } from 'expo-router';
import { Linking } from 'react-native';
import { shareContent } from './share';
import { mayRun } from './web-action';

type External = Extract<Action, { action: 'openUrl' | 'copy' }>;

async function runExternal(action: External): Promise<void> {
  await (action.action === 'openUrl'
    ? Linking.openURL(action.url)
    : setStringAsync(action.text));
}

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

type LocalAction = Extract<Action, { action: 'toast' | 'navigate' }>;

type DeviceAction = Exclude<Action, LocalAction>;

function runLocal(action: LocalAction): void {
  if (action.action === 'toast')
    showToast({ title: action.message, tone: 'success' });
  else openPage(action.path);
}

async function runDevice(action: DeviceAction): Promise<void> {
  if (action.action === 'pop') return router.back();

  await (action.action === 'share'
    ? shareContent(action)
    : runExternal(action));
}

async function dispatch(action: Action): Promise<void> {
  if (action.action === 'toast' || action.action === 'navigate')
    runLocal(action);
  else await runDevice(action);
}

// The built-in Actions run here, in the App, with no round trip to the Server.
export async function runAction(action: Action): Promise<void> {
  if (mayRun(action)) await dispatch(action);
}
