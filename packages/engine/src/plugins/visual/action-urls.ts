import { WebUrl } from '@repo/contracts/plugins/account-calls';
import type { WireJson } from '@repo/contracts/plugins/wire';

const externalActions = new Set(['openUrl', 'share']);

type ObjectValue = { [key: string]: WireJson } | WireJson[];

// Actions also occur inside Action.Sections. Check the whole prop value before it reaches an App.
export function actionUrlReason(value: WireJson): string | undefined {
  if (!isObject(value)) return;

  return Array.isArray(value) ? nestedReason(value) : objectReason(value);
}

const isObject = (value: WireJson): value is ObjectValue =>
  value !== null && typeof value === 'object';

const nestedReason = (values: WireJson[]): string | undefined =>
  values.map(actionUrlReason).find((reason) => reason !== undefined);

function ownUrlReason(value: Record<string, WireJson>): string | undefined {
  if (!isExternalAction(value)) return;

  if (value.url === undefined) return;

  return urlReason(value.url);
}

function urlReason(url: WireJson): string | undefined {
  if (WebUrl.safeParse(url).success) return;
  const scheme = typeof url === 'string' ? url.split(':')[0] : 'invalid';

  return `refused ${scheme}: URL scheme; Actions allow http: and https: only`;
}

const objectReason = (value: Record<string, WireJson>): string | undefined =>
  ownUrlReason(value) ?? nestedReason(Object.values(value));

const isExternalAction = (value: Record<string, WireJson>): boolean =>
  typeof value.action === 'string' && externalActions.has(value.action);
