import type { ServerSnapshot } from './server-machine.mocks';

export function acceptsAddress(snapshot: ServerSnapshot): boolean {
  return (
    snapshot.matches('locating') ||
    snapshot.matches('rechecking') ||
    snapshot.matches({ starting: { answering: 'checking' } })
  );
}

export function acceptsRunning(snapshot: ServerSnapshot): boolean {
  return (
    snapshot.matches({ abandoning: 'checking' }) ||
    snapshot.matches({ retrying: 'checking' }) ||
    snapshot.matches({ stopping: 'checking' })
  );
}
