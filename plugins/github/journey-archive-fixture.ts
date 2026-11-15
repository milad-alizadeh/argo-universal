import type { PluginTestOptions } from '@argo/plugin-kit/testing';
import type { GitHubFixture } from './github-fixture';
import type { Journey } from './journey-fixture';

type Archiving = { archived: string[]; running: Set<string> };

const archivingBy = new WeakMap<GitHubFixture, Archiving>();

function archivingOf(github: GitHubFixture): Archiving {
  const found = archivingBy.get(github) ?? {
    archived: [],
    running: new Set<string>(),
  };

  archivingBy.set(github, found);

  return found;
}

// The App's archive as the Plugin meets it: refused, as core does, while a Turn runs on the Session.
export function archiveRecorder(
  github: GitHubFixture,
): NonNullable<PluginTestOptions['archiveSession']> {
  const { archived, running } = archivingOf(github);

  return async (sessionId) => {
    if (running.has(sessionId))
      throw new Error(`Session ${sessionId} cannot accept session.archive`);

    archived.push(sessionId);
  };
}

// The Sessions archived so far, in order, surviving a restart of the Plugin.
export const archivedSessions = ({
  github,
}: Pick<Journey, 'github'>): string[] => archivingOf(github).archived;

// A Turn starts or ends on a Session.
export function setTurn(
  { github }: Pick<Journey, 'github'>,
  sessionId: string,
  running: boolean,
): void {
  const { running: turns } = archivingOf(github);

  if (running) turns.add(sessionId);
  else turns.delete(sessionId);
}
