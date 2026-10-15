import { Redirect } from 'expo-router';
import type * as React from 'react';

// The App opens on Sessions.
export default function FrameIndexRoute(): React.JSX.Element {
  return <Redirect href="/sessions" />;
}
