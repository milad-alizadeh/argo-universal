import {
  newSessionBranches,
  newSessionCatalogs,
  newSessionInputs,
  newSessionProjects,
  serverInfo,
} from '@repo/api/mocks';
import { type Fixtures, fails, pending } from './trpc-mock-link';

export const newSessionMocks = {
  'system.info': () => serverInfo,
  'projects.list': () => newSessionProjects,
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

export const sendingNewSessionMocks = {
  ...newSessionMocks,
  'session.new': pending(),
} satisfies Fixtures;

export const failedStartMessage = 'The Agent exited before its first Turn.';

export const failedStartNewSessionMocks = {
  ...newSessionMocks,
  'session.new': fails(failedStartMessage),
} satisfies Fixtures;
