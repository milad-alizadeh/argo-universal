import type { Action } from '@repo/contracts/plugins/wire';
import { setStringAsync } from 'expo-clipboard';
import { router } from 'expo-router';
import { Linking } from 'react-native';
import { showToast } from '#primitives/overlays/toast';

type External = Extract<Action, { action: 'openUrl' | 'copy' }>;

async function runExternal(action: External): Promise<void> {
  await (action.action === 'openUrl'
    ? Linking.openURL(action.url)
    : setStringAsync(action.text));
}

// The built-in Actions run here, in the App, with no round trip to the Server.
export async function runAction(action: Action): Promise<void> {
  if (action.action === 'toast')
    showToast({ title: action.message, tone: 'success' });
  else if (action.action === 'navigate') router.push(action.path);
  else await runExternal(action);
}
