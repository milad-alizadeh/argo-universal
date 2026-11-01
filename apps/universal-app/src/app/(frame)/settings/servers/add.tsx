import { AddServerScreen } from '@repo/client';
import { useLocalSearchParams } from 'expo-router';
import type * as React from 'react';

// Set only when building to prove pairing on a real phone, where a camera cannot be aimed at a screen: the code arrives in the link instead. The owner's Allow on the Server Device is still the only way in (ADR-0045).
const codeInLink = process.env.EXPO_PUBLIC_ARGO_PAIR_LINK === '1';

type LinkParams = Record<string, string | string[] | undefined>;

const textOf = (value: string | string[] | undefined): string | undefined =>
  typeof value === 'string' ? value : undefined;

type Link = React.ComponentProps<typeof AddServerScreen>['link'];

const addressIn = (params: LinkParams): NonNullable<Link>['address'] => {
  const host = textOf(params.host);
  const port = textOf(params.port);

  return host && port ? { host, port: Number(port) } : undefined;
};

const linkIn = (params: LinkParams): Link => {
  const invite = textOf(params.invite);

  return codeInLink && invite
    ? { invite, address: addressIn(params) }
    : undefined;
};

export default function AddServerRoute(): React.JSX.Element {
  return <AddServerScreen link={linkIn(useLocalSearchParams())} />;
}
