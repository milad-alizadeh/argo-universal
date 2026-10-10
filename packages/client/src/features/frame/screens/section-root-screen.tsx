import type * as React from 'react';
import type { ComponentType } from 'react';
import { FirstSessionScreen } from '#features/sessions';
import type { Section } from '../../../lib/product/navigation/sections';
import { SectionRootView } from '../components/section-root-view';
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

// A section root: the section's connected list on a phone, and its first page on a wide window.
export function SectionRootScreen({
  section,
}: SectionRootScreenProps): React.JSX.Element {
  const RootPage = rootPages[section];
  return (
    <SectionRootView
      phone={<PhoneSectionScreen section={section} />}
      page={<RootPage />}
    />
  );
}
