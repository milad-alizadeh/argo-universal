import {
  ProjectInfo,
  SessionGetInput,
  SessionGetOutput,
  SessionNewInput,
  SessionNewOutput,
  SessionSetConfigOptionInput,
  SessionSetConfigOptionOutput,
} from '@repo/contracts';
import { registryOperations } from '@repo/contracts/operations/registry';
import { pollUntil } from '@repo/process';
import { z } from 'zod';
import type { PinnedOption, RealAgentChoice } from './real-agent-choice.mts';
import { costPinFailure } from './real-agent-cost.mts';
import { mutate, query } from './trpc-http.mts';

/*
 * What a real-Agent perf run asks the Server to do: fetch the published Registry, install the
 * chosen Agent, and pin a Session to the cheapest model before anything is prompted.
 *
 * Every step goes through the Server's own operations, the same ones the App and the `argo` CLI
 * call. The two `confirm`-tier operations here, `registry.sync` and `agent.install`, are confirmed
 * by the caller: the tier gates an Agent asking from inside a Session, not a direct caller.
 */

const procedures = {
  projects: {
    path: 'project.list',
    input: z.strictObject({}).default({}),
    output: z.array(ProjectInfo.pick({ id: true }).strip()),
  },
  syncRegistry: {
    path: registryOperations['registry.sync'].id,
    input: registryOperations['registry.sync'].params,
    output: registryOperations['registry.sync'].result,
  },
  installAgent: {
    path: registryOperations['agent.install'].id,
    input: registryOperations['agent.install'].params,
    output: registryOperations['agent.install'].result,
  },
  newSession: {
    path: 'session.new',
    input: SessionNewInput,
    output: SessionNewOutput,
  },
  session: {
    path: 'session.get',
    input: SessionGetInput,
    output: SessionGetOutput,
  },
  setConfigOption: {
    path: 'session.setConfigOption',
    input: SessionSetConfigOptionInput,
    output: SessionSetConfigOptionOutput,
  },
} as const;

export async function realProjectId(httpUrl: string): Promise<string> {
  const projectId = (await query(httpUrl, procedures.projects)).at(0)?.id;

  if (!projectId)
    throw new Error('The real Server seeded no Project from ARGO_PROJECT_PATH');

  return projectId;
}

/*
 * Fetches the published Registry and installs the chosen Agent. An Agent the Registry does not list
 * is refused by name: `agent.install` would otherwise fail later, after the run has already set up.
 */
export async function installRealAgent(
  httpUrl: string,
  { id }: RealAgentChoice,
): Promise<void> {
  const registry = await query(httpUrl, procedures.syncRegistry);
  const listed = registry.agents.map((agent): string => agent.entry.id);
  const why = registry.error ?? 'it lists other Agents';

  if (!listed.includes(id))
    throw new Error(
      `The published Registry does not list ${id} (${why}), so a real-Agent run cannot install it.`,
    );

  await mutate(httpUrl, procedures.installAgent, { id });
}

const snapshot = (
  httpUrl: string,
  sessionId: string,
): Promise<z.output<typeof SessionGetOutput>> =>
  query(httpUrl, procedures.session, { sessionId });

// The Session's row count, which the Server raises for every Feed row it writes.
export const sessionRevision = async (
  httpUrl: string,
  sessionId: string,
): Promise<number> => (await snapshot(httpUrl, sessionId)).maxRevision;

/*
 * Creates a Session on the real Agent, already pinned to the cheapest model and with no prompt, so
 * nothing is billed before the pin has been read back.
 */
export async function newPinnedSession(
  httpUrl: string,
  { id, pin }: RealAgentChoice,
  projectId: string,
): Promise<string> {
  const { sessionId } = await mutate(httpUrl, procedures.newSession, {
    projectId,
    agent: id,
    checkout: { type: 'main' },
    // Copied because the contract takes a mutable array, not because the shape differs.
    configOptions: [...pin],
    prompt: [],
  });

  return sessionId;
}

/*
 * The Session's own options, read back after the pin rather than from the reply that applied it.
 * `session.setConfigOption` opens the Session, so by the time this reads there is an Agent to
 * report them; a Session still reporting none is polled rather than read as pinned.
 */
const reportedOptions = (
  httpUrl: string,
  sessionId: string,
): Promise<z.output<typeof SessionGetOutput>['configOptions']> =>
  pollUntil(async () => {
    const options = (await snapshot(httpUrl, sessionId)).configOptions;

    return options.length ? options : undefined;
  }, `Session ${sessionId} reported no Agent options`);

// Asks the Agent for each pinned option, through the operation the App's own controls use.
async function applyPin(
  httpUrl: string,
  pin: readonly PinnedOption[],
  sessionId: string,
): Promise<void> {
  for (const { configId, value } of pin)
    await mutate(httpUrl, procedures.setConfigOption, {
      sessionId,
      configId,
      type: 'id',
      value,
    });
}

/*
 * Pins the Session to the options the run named, and proves it took: the Agent is asked, then the
 * Session's own `currentValue`s are read back. A run whose read-back disagrees throws here, before
 * it prompts, rather than billing the owner at the adapter's default.
 */
export async function pinBeforePrompting(
  httpUrl: string,
  pin: readonly PinnedOption[],
  sessionId: string,
): Promise<void> {
  await applyPin(httpUrl, pin, sessionId);

  const failure = costPinFailure(
    pin,
    await reportedOptions(httpUrl, sessionId),
  );

  if (failure) throw new Error(failure);
}
