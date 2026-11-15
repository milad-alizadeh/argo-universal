import type { PluginTestOptions } from '@argo/plugin-kit/testing';
import type { GitHubFixture } from './github-fixture';
import type { Journey } from './journey-fixture';

type Archiving = {
  archived: string[];
  running: Set<string>;
  uncommitted: Set<string>;
};

const archivingBy = new WeakMap<GitHubFixture, Archiving>();

function archivingOf(github: GitHubFixture): Archiving {
  const found = archivingBy.get(github) ?? {
    archived: [],
    running: new Set<string>(),
    uncommitted: new Set<string>(),
  };

  archivingBy.set(github, found);

  return found;
}

// A Plugin's archive as it meets core: refused while a Turn runs on the Session or its Checkout has uncommitted files.
export function archiveRecorder(
  github: GitHubFixture,
): NonNullable<PluginTestOptions['archiveSession']> {
  const { archived, running, uncommitted } = archivingOf(github);

  return async (sessionId) => {
    if (running.has(sessionId))
      throw new Error(`Session ${sessionId} cannot accept session.archive`);

    if (uncommitted.has(sessionId))
      throw new Error(`Session ${sessionId} has uncommitted files`);

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

// The Session's Checkout gains or loses uncommitted files.
export function setUncommitted(
  { github }: Pick<Journey, 'github'>,
  sessionId: string,
  has: boolean,
): void {
  const { uncommitted } = archivingOf(github);

  if (has) uncommitted.add(sessionId);
  else uncommitted.delete(sessionId);
}
