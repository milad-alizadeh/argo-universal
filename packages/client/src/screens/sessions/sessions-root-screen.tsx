import type * as React from 'react';
import { SectionRootView } from '#features/frame';
import { FirstSessionScreen } from './first-session-screen';
import { SessionsPhoneScreen } from './sessions-phone-screen';

// The Sessions root: the connected list on a phone, and the first Session's page on a wide window.
export function SessionsRootScreen(): React.JSX.Element {
  return (
    <SectionRootView
      phone={<SessionsPhoneScreen />}
      page={<FirstSessionScreen />}
    />
  );
}
