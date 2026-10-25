import { WebUrl } from '@repo/contracts/plugins/account-calls';
import type { Action } from '@repo/contracts/plugins/wire';

const urlOf = (action: Action): string | undefined =>
  'url' in action ? action.url : undefined;

// The wire schema narrows Action URLs to http: and https:; the App checks again before it acts.
export const mayRun = (action: Action): boolean => {
  const url = urlOf(action);

  return url === undefined || WebUrl.safeParse(url).success;
};
