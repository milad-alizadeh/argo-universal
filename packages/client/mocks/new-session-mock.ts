import {
  newSessionBranches,
  newSessionCatalogs,
  newSessionInputs,
  projectsList,
} from '@repo/api/mocks';
import type { Fixtures } from './trpc-mock-link';

export const newSessionMocks = {
  'projects.list': () => projectsList,
  'projects.branches': () => newSessionBranches,
  'agents.list': () => newSessionCatalogs.bothAvailable,
  'blob.upload': () => {
    const image = newSessionInputs[0]?.prompt.find(
      (block) => block.type === 'image',
    );
    if (image?.type !== 'image') throw new Error('Missing image mock');
    return image.blob;
  },
  'session.new': () => ({ sessionId: 'new-session' }),
} satisfies Fixtures;

export const notInstalledNewSessionMocks = {
  ...newSessionMocks,
  'agents.list': () => newSessionCatalogs.oneNotInstalled,
} satisfies Fixtures;

export const notSignedInNewSessionMocks = {
  ...newSessionMocks,
  'agents.list': () => newSessionCatalogs.oneNotSignedIn,
} satisfies Fixtures;
