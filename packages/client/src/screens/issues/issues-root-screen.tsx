import type * as React from 'react';
import { SectionRootView, PlaceholderPhoneScreen } from '#features/frame';
import { IssuesScreen } from './issues-screen';

// The Issues root: a placeholder list on a phone, and the Issues page on a wide window.
export function IssuesRootScreen(): React.JSX.Element {
  return (
    <SectionRootView
      phone={<PlaceholderPhoneScreen section="issues" />}
      page={<IssuesScreen />}
    />
  );
}
