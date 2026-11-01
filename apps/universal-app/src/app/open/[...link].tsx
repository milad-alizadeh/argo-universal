import { OpenLinkScreen } from '@repo/client';
import { useLocalSearchParams } from 'expo-router';
import type * as React from 'react';

// Every Screen link lands here, outside the Frame, and is resolved before any page of the Frame opens.
export default function OpenRoute(): React.JSX.Element {
  const { link = [], ...rest } = useLocalSearchParams<{ link?: string[] }>();

  return (
    <OpenLinkScreen segments={link} stray={Object.keys(rest).length > 0} />
  );
}
