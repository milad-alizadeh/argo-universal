import { AddServerScreen } from '@repo/client';
import { useLocalSearchParams } from 'expo-router';
import type * as React from 'react';

// Set only when building to prove pairing on a real phone, where a camera cannot be aimed at a screen: the code arrives in the link instead. The owner's Allow on the Server Device is still the only way in (ADR-0045).
const codeInLink = process.env.EXPO_PUBLIC_ARGO_PAIR_LINK === '1';

interface LinkParams {
  invite?: string;
  host?: string;
  port?: string;
}

type Link = React.ComponentProps<typeof AddServerScreen>['link'];

const addressIn = ({ host, port }: LinkParams): NonNullable<Link>['address'] =>
  host && port ? { host, port: Number(port) } : undefined;

const linkIn = (params: LinkParams): Link =>
  codeInLink && params.invite
    ? { invite: params.invite, address: addressIn(params) }
    : undefined;

export default function AddServerRoute(): React.JSX.Element {
  return <AddServerScreen link={linkIn(useLocalSearchParams<LinkParams>())} />;
}
