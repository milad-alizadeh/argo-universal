import type { AgentsListInput } from '@repo/contracts';
import {
  newSessionBranches,
  newSessionCatalogs,
  newSessionInputs,
  newSessionProjects,
  serverInfo,
} from '@repo/mocks/app';
import type { FixtureOutput } from './trpc-mock-link';
import { type Fixtures, fails, pending } from './trpc-mock-link';

export const newSessionMocks = {
  'system.info': (): typeof serverInfo => serverInfo,
  'projects.list': (): typeof newSessionProjects => newSessionProjects,
  'projects.branches': (): typeof newSessionBranches => newSessionBranches,
  'agents.list': (): typeof newSessionCatalogs.bothAvailable =>
    newSessionCatalogs.bothAvailable,
  'blob.upload': (): FixtureOutput<'blob.upload'> => {
    const image = newSessionInputs[0]?.prompt.find(
      (block) => block.type === 'image',
    );
    if (image?.type !== 'image') throw new Error('Missing image mock');
    return image.blob;
  },
  'session.new': (): FixtureOutput<'session.new'> => ({
    sessionId: 'new-session',
  }),
} satisfies Fixtures;

export const notInstalledNewSessionMocks = {
  ...newSessionMocks,
  'agents.list': (): typeof newSessionCatalogs.oneNotInstalled =>
    newSessionCatalogs.oneNotInstalled,
} satisfies Fixtures;

export const notSignedInNewSessionMocks = {
  ...newSessionMocks,
  'agents.list': (): typeof newSessionCatalogs.oneNotSignedIn =>
    newSessionCatalogs.oneNotSignedIn,
} satisfies Fixtures;

export const agentProbeRequests: AgentsListInput[] = [];
export const unavailableNewSessionMocks = {
  ...newSessionMocks,
  'agents.list': (input): FixtureOutput<'agents.list'> => {
    agentProbeRequests.push(input ?? undefined);
    return input?.refresh
      ? newSessionCatalogs.bothAvailable
      : newSessionCatalogs.bothUnavailable;
  },
} satisfies Fixtures;

export const sendingNewSessionMocks = {
  ...newSessionMocks,
  'session.new': pending(),
} satisfies Fixtures;

export const failedStartMessage = 'The Agent exited before its first Turn.';

export const failedStartNewSessionMocks = {
  ...newSessionMocks,
  'session.new': fails(failedStartMessage),
} satisfies Fixtures;
