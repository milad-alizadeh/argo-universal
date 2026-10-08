import type * as React from 'react';
import type { ComponentType } from 'react';
import type { Section } from '../navigation/sections';
import { useWide } from '../navigation/use-wide';
import { FirstSessionScreen } from './first-session-screen';
import { PhoneSectionScreen } from './phone-section-screen';
import {
  AccountsScreen,
  AtlasScreen,
  IssuesScreen,
} from './placeholder-screens';

// The page a wide window opens beside each section's list.
const rootPages = {
  sessions: FirstSessionScreen,
  issues: IssuesScreen,
  atlas: AtlasScreen,
  settings: AccountsScreen,
} satisfies Record<Section, ComponentType>;

export interface SectionRootScreenProps {
  section: Section;
}

// A section root: its list on a phone, and its first page on a wide window.
export function SectionRootScreen({
  section,
}: SectionRootScreenProps): React.JSX.Element {
  const wide = useWide();
  if (!wide) return <PhoneSectionScreen section={section} />;
  const RootPage = rootPages[section];
  return <RootPage />;
}
