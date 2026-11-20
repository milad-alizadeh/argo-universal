import { Linking } from 'react-native';
import type { SessionPullRequest } from '#features/sessions';

// A pull request opens on its code host.
export function openPullRequest({ url }: SessionPullRequest): void {
  if (url) void Linking.openURL(url);
}
