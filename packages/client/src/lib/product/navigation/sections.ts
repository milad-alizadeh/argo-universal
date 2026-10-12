import type { NavigationDestination } from './context';

export type Section = 'sessions' | 'issues' | 'atlas' | 'settings';

export function sectionOf(destination: NavigationDestination): Section {
  switch (destination.to) {
    case 'sessions':
    case 'new-session':
    case 'session':
      return 'sessions';
    case 'issues':
    case 'atlas':
      return destination.to;
    case 'settings':
    case 'settings-projects':
    case 'settings-agents':
    case 'settings-devices':
    case 'settings-appearance':
    case 'settings-notifications':
    case 'settings-accounts':
    case 'settings-project':
    case 'settings-connection':
    case 'settings-agent-new':
    case 'settings-agent':
      return 'settings';
  }
}

// Each section opens on its list; a wide window adds the first detail beside it without changing the URL.
export function sectionDestination(section: Section): NavigationDestination {
  return { to: section };
}
