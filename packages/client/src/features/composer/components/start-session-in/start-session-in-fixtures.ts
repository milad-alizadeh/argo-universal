import { newSessionProjects, serverInfo } from '@repo/mocks/app';
import type { StartSessionInProps } from './start-session-in';

// A story supplies the Project callback; a fixture is the Server, the Projects and the checkout.
type StartSessionInFixture = Omit<StartSessionInProps, 'onProjectChange'>;

const [firstProject] = newSessionProjects;

if (!firstProject) throw new Error('New Session mocks need a Project.');

// The Server answering, on its main checkout.
export const connectedServer = {
  serverName: serverInfo.name,
  serverConnected: true,
  projects: newSessionProjects,
  projectId: firstProject.id,
  checkout: { branch: 'main', newWorktree: false },
} satisfies StartSessionInFixture;

// The Server is not answering: it names itself with a warning dot and says it is reconnecting.
export const reconnectingServer = {
  ...connectedServer,
  serverConnected: false,
} satisfies StartSessionInFixture;
