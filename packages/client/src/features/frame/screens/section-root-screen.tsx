import type * as React from 'react';
import type { ComponentType } from 'react';
import { FirstSessionScreen } from '#features/sessions';
import type { Section } from '../../../lib/product/navigation/sections';
import { SectionRootView } from '../components/section-root-view/section-root-view';
import { PlaceholderPhoneScreen } from './placeholder-phone-screen';
import { AtlasScreen, IssuesScreen } from './placeholder-screens';
import { SessionsPhoneScreen } from './sessions-phone-screen';
import { SettingsPhoneScreen } from './settings-phone-screen';

// The page a wide window opens beside each section's list; Settings has none, as a wide window opens its first page.
const rootPages: Partial<Record<Section, ComponentType>> = {
  sessions: FirstSessionScreen,
  issues: IssuesScreen,
  atlas: AtlasScreen,
};

// What a phone shows: the section's own screen, which sets its native header.
function phoneScreen(section: Section): React.JSX.Element {
  if (section === 'sessions') return <SessionsPhoneScreen />;

  if (section === 'settings') return <SettingsPhoneScreen />;

  return <PlaceholderPhoneScreen section={section} />;
}

export interface SectionRootScreenProps {
  section: Section;
}

// A section root: the section's connected list on a phone, and its first page on a wide window.
export function SectionRootScreen({
  section,
}: SectionRootScreenProps): React.JSX.Element {
  const RootPage = rootPages[section];
  const phone = phoneScreen(section);

  return (
    <SectionRootView phone={phone} page={RootPage ? <RootPage /> : phone} />
  );
}
