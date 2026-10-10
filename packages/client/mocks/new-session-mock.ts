import {
  newSessionBranches,
  newSessionCatalogs,
  newSessionInputs,
  newSessionProjects,
  serverInfo,
} from '@repo/mocks/app';
import type { FixtureOutput } from './trpc-mock-link';
import type { Fixtures } from './trpc-mock-link';

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
