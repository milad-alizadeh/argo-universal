import { SettingsPhoneScreen, useWide } from '@repo/client';
import type * as React from 'react';
import { OpenFirstPage } from '@/navigation/open-first-page';

export default function SettingsRoute(): React.JSX.Element {
  return useWide() ? (
    <OpenFirstPage page="accounts" />
  ) : (
    <SettingsPhoneScreen />
  );
}
