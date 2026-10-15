import type * as React from 'react';
import { SectionRootView, PlaceholderPhoneScreen } from '#features/frame';
import { AtlasScreen } from './atlas-screen';

// The Atlas root: a placeholder list on a phone, and the Atlas page on a wide window.
export function AtlasRootScreen(): React.JSX.Element {
  return (
    <SectionRootView
      phone={<PlaceholderPhoneScreen section="atlas" />}
      page={<AtlasScreen />}
    />
  );
}
