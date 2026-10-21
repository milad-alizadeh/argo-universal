import type { ShellListProps } from './shell-list';
import {
  endedShells as everyEnding,
  sessionShells,
  shellNow,
} from './shell-list.mocks';

// A story supplies onSelect; a fixture is the Session's Shells and the clock they read against.
type ShellListFixture = Omit<ShellListProps, 'onSelect'>;

export const runningShells = {
  shells: sessionShells,
  now: shellNow,
} satisfies ShellListFixture;

export const endedShells = {
  shells: everyEnding,
  now: shellNow,
} satisfies ShellListFixture;
