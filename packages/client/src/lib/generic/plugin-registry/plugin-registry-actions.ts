import { setStringAsync } from 'expo-clipboard';
import { router } from 'expo-router';
import { Linking } from 'react-native';
import { showToast } from '#primitives/overlays/toast';
import type { Action } from './plugin-registry-schemas';

// The built-in Actions run here, in the App, with no round trip to the Server.
export function runAction(action: Action): void {
  switch (action.action) {
    case 'toast':
      showToast({ title: action.message, tone: 'success' });
      break;
    case 'navigate':
      router.push(action.path as never);
      break;
    case 'openUrl':
      void Linking.openURL(action.url);
      break;
    case 'copy':
      void setStringAsync(action.text);
      break;
  }
}
