import type { NavigationDestination } from './context';

export type Section = 'sessions' | 'issues' | 'atlas' | 'settings';

// The sections top to bottom in the rail and the drawer.
export const sectionOrder = [
  'sessions',
  'issues',
  'atlas',
  'settings',
] as const satisfies readonly Section[];

const destinationSections: Record<NavigationDestination['to'], Section> = {
  sessions: 'sessions',
  'new-session': 'sessions',
  session: 'sessions',
  issues: 'issues',
  atlas: 'atlas',
  settings: 'settings',
  'settings-projects': 'settings',
  'settings-agents': 'settings',
  'settings-devices': 'settings',
  'settings-appearance': 'settings',
  'settings-notifications': 'settings',
  'settings-accounts': 'settings',
  'settings-project': 'settings',
  'settings-connection': 'settings',
  'settings-agent-new': 'settings',
  'settings-agent': 'settings',
};

export function sectionOf(destination: NavigationDestination): Section {
  return destinationSections[destination.to];
}

// Each section opens on its list; a wide window adds the first detail beside it without changing the URL.
export function sectionDestination(section: Section): NavigationDestination {
  return { to: section };
}
