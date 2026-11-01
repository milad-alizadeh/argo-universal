import { useErrorToast } from '@repo/kit/primitives/overlays/toast';
import { Redirect } from 'expo-router';
import type * as React from 'react';
import { View } from 'react-native';
import { useOpenLink } from '#features/app-navigation';

interface OpenLinkScreenProps {
  // The `/open` route's catch-all segments: the Server's id, then the destination.
  segments: readonly string[];
  // The link carried a query, which a Screen link never does.
  stray: boolean;
}

type Outcome = ReturnType<typeof useOpenLink>;

const refusal = (
  outcome: Outcome,
): { title: string; message: string } | undefined =>
  outcome.status === 'refused'
    ? { title: 'Link not opened', message: outcome.message }
    : undefined;

function Landing({ outcome }: { outcome: Outcome }): React.JSX.Element {
  if (outcome.status === 'open') return <Redirect href={outcome.href} />;

  return outcome.status === 'refused' ? (
    <Redirect href="/sessions" />
  ) : (
    <View className="flex-1 bg-content" />
  );
}

/*
 * The entry every Screen link reaches: `argo://open/...` on iOS and Android, and `/open/...` on the web's current
 * origin. It opens the Screen it names, or says why not and returns to Sessions. It only navigates.
 */
export function OpenLinkScreen(props: OpenLinkScreenProps): React.JSX.Element {
  const outcome = useOpenLink(props.segments, props.stray);

  useErrorToast(refusal(outcome));

  return <Landing outcome={outcome} />;
}
