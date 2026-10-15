import { sessionsHeaderItems, sessionsHeaderSearch } from '#features/sessions';
import { useNavigate } from '#lib/product/navigation/context';
import type { ScreenHeaderProps } from '#lib/product/navigation/screen-header';
import type { Section } from '../../../lib/product/navigation/sections';
import { shellSections } from '../components/shell-sections';
import { type SectionFilters, useSectionFilters } from './section-filters';

export type SectionRootHeaders = Record<Section, ScreenHeaderProps>;

const sessionsRootHeader = (
  sessions: SectionFilters['sessions'],
  onNewSession: () => void,
): ScreenHeaderProps => ({
  title: shellSections.sessions.title,
  right: sessionsHeaderItems(sessions),
  search: sessionsHeaderSearch(sessions, onNewSession),
});

const settingsRootHeader = (
  onChangeText: SectionFilters['onSettingsQueryChange'],
): ScreenHeaderProps => ({
  title: shellSections.settings.title,
  search: { placeholder: 'Search Settings', onChangeText },
});

const sectionRootHeaders = (
  { sessions, onSettingsQueryChange }: SectionFilters,
  onNewSession: () => void,
): SectionRootHeaders => ({
  sessions: sessionsRootHeader(sessions, onNewSession),
  issues: { title: shellSections.issues.title },
  atlas: { title: shellSections.atlas.title },
  settings: settingsRootHeader(onSettingsQueryChange),
});

// What each section root's narrow header shows: the title, its trailing items and its search, wired to the shell's filters.
export function useSectionRootHeaders(): SectionRootHeaders {
  const navigate = useNavigate();

  return sectionRootHeaders(useSectionFilters(), () =>
    navigate({ to: 'new-session' }),
  );
}
