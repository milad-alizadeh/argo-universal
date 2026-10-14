import { randomUUID } from 'node:crypto';
import {
  AgentCatalogReplaceJob,
  createAgentResolver,
  type AgentInstallations,
  type AgentReadiness,
  createAgentChecker,
  createAgentReadiness,
} from '../agents';
import type { OpenSessionsActorRef } from '../sessions';
import type { AppRouterDeps, AppRouterInput } from './router-deps';

type AgentSetup = Pick<AppRouterDeps, 'installations' | 'agentLogins'>;
type Wired = Pick<AppRouterDeps, 'checkAgentLaunch' | 'readiness' | 'resolver'>;

// Readiness checks the same saved launch a Session uses, under the installation's setup ownership.
function createReadiness(
  input: AppRouterInput,
  installations: AgentInstallations,
  checkAgentLaunch: AppRouterDeps['checkAgentLaunch'],
): Pick<Wired, 'readiness' | 'resolver'> {
  const { database, databaseWriter } = input;
  const home = input.home ?? '';
  const withAgentCheck = installations.check;
  const deps = { database, databaseWriter, home, now: Date.now };
  const resolver = createAgentResolver(deps);
  const readiness = createAgentReadiness({
    ...deps,
    checkAgentLaunch,
    withAgentCheck,
    resolve: resolver.resolveEvery,
  });
  return { readiness, resolver };
}

function sessionsUseAgent(
  sessions: OpenSessionsActorRef,
  agentId: string,
): boolean {
  const { acpResources, sessions: open } = sessions.getSnapshot().context;
  return (
    !!acpResources?.isAgentInUse(agentId) ||
    Object.values(open).some((session) => {
      const { agent } = session.getSnapshot().context;
      return !agent || agent === agentId;
    })
  );
}

function bindInstallations(input: AppRouterInput & AgentSetup & Wired): void {
  input.installations.bind({
    ...input,
    createId: input.createId ?? randomUUID,
    isInUse: (agentId) =>
      input.agentLogins.isBusy(agentId) ||
      sessionsUseAgent(input.sessions, agentId),
    afterInstall: input.readiness.recheckLater,
    afterRemove: () => {
      void input.resolver.resolveEvery().catch(() => {});
    },
  });
}

// A catalog sync can name Agents already on this machine; each newly found one is checked.
function resolveAfterCatalogSync(
  input: AppRouterInput,
  { readiness, resolver }: Pick<Wired, 'readiness' | 'resolver'>,
): void {
  input.databaseWriter.on('writer.committed', ({ jobs }) => {
    if (!jobs.some((job) => job instanceof AgentCatalogReplaceJob)) return;
    void resolver
      .resolveEvery()
      .then((found) => found.forEach(readiness.recheckLater))
      .catch(() => {});
  });
}

function recheckOnEvents(
  input: AppRouterInput,
  setup: AgentSetup,
  readiness: AgentReadiness,
): void {
  setup.agentLogins.afterLogin(readiness.recheckLater);
  const { acpResources } = input.sessions.getSnapshot().context;
  acpResources?.observeSignInRequired(readiness.signInRequired);
  readiness.recheckEveryLater();
}

// Checks again after install, sign-in and enablement, and every Agent once at Server start.
export function wireAgentReadiness(
  input: AppRouterInput,
  setup: AgentSetup,
): Wired {
  const { launchProcess, checkTimeoutMs } = input.acp ?? {};
  const checkAgentLaunch = createAgentChecker(launchProcess, checkTimeoutMs);
  const { installations } = setup;
  const { readiness, resolver } = createReadiness(
    input,
    installations,
    checkAgentLaunch,
  );
  const wired = { checkAgentLaunch, readiness, resolver };
  bindInstallations({ ...input, ...setup, ...wired });
  resolveAfterCatalogSync(input, wired);
  recheckOnEvents(input, setup, readiness);
  return wired;
}
