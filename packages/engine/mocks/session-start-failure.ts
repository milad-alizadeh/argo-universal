import type { ScriptedScenario } from '@repo/mocks/agent/scripted-scenario';
import { startAcpEngine } from './acp-engine';
import { sessionJourneyGit } from './session-journey';

export const signInFailure = 'Sign in first';

export const failingAgent = 'refusing-agent';

// ACP's auth_required, and an ordinary internal error.
export const authRequiredCode = -32000;

export const internalErrorCode = -32603;

const failedStart = (code: number): ScriptedScenario => ({
  steps: [],
  responses: {
    'session/new': [{ error: { code, message: signInFailure } }],
  },
});

export type FailedJourney = Awaited<ReturnType<typeof startAcpEngine>> & {
  git: ReturnType<typeof sessionJourneyGit>;
};

export const startFailedSessionJourney = async (
  code = authRequiredCode,
): Promise<FailedJourney> => {
  const host = await startAcpEngine(failedStart(code), undefined, failingAgent);

  const project = (await host.caller.projects.list()).find(
    ({ id }) => id === 'project-1',
  );

  if (!project) throw new Error('No Project');

  return { ...host, git: sessionJourneyGit(project.path) };
};
