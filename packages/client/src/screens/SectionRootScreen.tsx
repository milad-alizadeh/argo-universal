import type { ComponentType } from 'react';
import type { ShellSection } from '../components/shell-sections';
import { useWide } from '../navigation/use-wide';
import { FirstSessionScreen } from './FirstSessionScreen';
import { PhoneSectionScreen } from './PhoneSectionScreen';
import {
  AccountsScreen,
  AtlasScreen,
  IssuesScreen,
} from './PlaceholderScreens';

// The page a wide window opens beside each section's list.
const rootPages = {
  sessions: FirstSessionScreen,
  issues: IssuesScreen,
  atlas: AtlasScreen,
  settings: AccountsScreen,
} satisfies Record<ShellSection, ComponentType>;

export interface SectionRootScreenProps {
  section: ShellSection;
}

// A section root: its list on a phone, and its first page on a wide window.
export function SectionRootScreen({ section }: SectionRootScreenProps) {
  const wide = useWide();
  if (!wide) return <PhoneSectionScreen section={section} />;
  const RootPage = rootPages[section];
  return <RootPage />;
}
