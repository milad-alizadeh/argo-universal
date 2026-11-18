import type { AddServerScreen } from '@repo/client';

type Link = React.ComponentProps<typeof AddServerScreen>['link'];

type LinkParams = Record<string, string | string[] | undefined>;

export const pairLinkEnabled = process.env.EXPO_PUBLIC_ARGO_PAIR_LINK === '1';

const textOf = (value: string | string[] | undefined): string | undefined =>
  typeof value === 'string' ? value : undefined;

const addressIn = (params: LinkParams): NonNullable<Link>['address'] => {
  const host = textOf(params.host);
  const port = textOf(params.port);

  return host && port ? { host, port: Number(port) } : undefined;
};

export const pairLinkIn = (params: LinkParams, enabled: boolean): Link => {
  const invite = textOf(params.invite);

  return enabled && invite ? { invite, address: addressIn(params) } : undefined;
};

const addRoute = /^(\/?)settings\/servers\/add(?=\?|$)/;

export const pairPathOf = (path: string, enabled: boolean): string =>
  enabled ? path.replace(addRoute, '$1pair') : path;
