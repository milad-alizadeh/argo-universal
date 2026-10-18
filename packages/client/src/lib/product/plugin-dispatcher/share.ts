import type { DesktopBridge } from '@repo/contracts';
import type { Action } from '@repo/contracts/plugins/wire';
import { Share } from 'react-native';

export async function shareContent(
  action: Extract<Action, { action: 'share' }>,
): Promise<void> {
  const { message, title, url } = action;
  const content = { message, title, url };
  const desktopShare = nativeShare();

  await (desktopShare ? desktopShare(content) : Share.share(content));
}

function nativeShare(): DesktopBridge['share'] {
  return globalThis.window?.argo?.share;
}
