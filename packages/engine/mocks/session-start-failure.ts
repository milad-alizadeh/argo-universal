import type { ScriptedScenario } from '@repo/mocks/agent/scripted-scenario';
import { startAcpEngine } from './acp-engine';
import { sessionJourneyGit } from './session-journey';

export const signInFailure = 'Sign in first';
const failedStart: ScriptedScenario = {
  steps: [],
  responses: {
    'session/new': [{ error: { code: -32000, message: signInFailure } }],
  },
};
type FailedJourney = Awaited<ReturnType<typeof startAcpEngine>> & {
  git: ReturnType<typeof sessionJourneyGit>;
};
export const startFailedSessionJourney = async (): Promise<FailedJourney> => {
  const host = await startAcpEngine(failedStart, undefined, 'unavailable');
  const project = (await host.caller.projects.list()).find(
    ({ id }) => id === 'project-1',
  );
  if (!project) throw new Error('No Project');
  return { ...host, git: sessionJourneyGit(project.path) };
};
