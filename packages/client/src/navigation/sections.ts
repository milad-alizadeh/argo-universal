import type { ShellSection } from '../components/shell-sections';
import type { NavigationDestination } from './context';

export function sectionOf(destination: NavigationDestination): ShellSection {
  switch (destination.to) {
    case 'sessions':
    case 'new-session':
    case 'session':
      return 'sessions';
    case 'issues':
    case 'atlas':
      return destination.to;
    default:
      return 'settings';
  }
}

// Each section opens on its list; a wide window adds the first detail beside it without changing the URL.
export function sectionDestination(
  section: ShellSection,
): NavigationDestination {
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
