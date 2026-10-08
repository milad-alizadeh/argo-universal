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
    case 'settings-agent':
      return 'settings';
  }
}

// Each section opens on its list; a wide window adds the first detail beside it without changing the URL.
export function sectionDestination(section: Section): NavigationDestination {
  return { to: section };
}

export function destinationTitle(destination: NavigationDestination): string {
  switch (destination.to) {
    case 'sessions':
      return 'Sessions';
    case 'new-session':
      return 'New Session';
    case 'session':
      return 'Session';
    case 'issues':
      return 'Issues';
    case 'atlas':
      return 'Atlas';
    case 'settings':
      return 'Settings';
    case 'settings-projects':
      return 'Projects';
    case 'settings-agents':
      return 'Agents';
    case 'settings-devices':
      return 'Devices';
    case 'settings-appearance':
      return 'Appearance';
    case 'settings-notifications':
      return 'Notifications';
    case 'settings-accounts':
      return 'Accounts';
    case 'settings-connection':
      return 'Connection';
    case 'settings-project':
      return destination.name;
    case 'settings-agent':
      return destination.agent;
  }
}
