import { prepareRealProject, startRealServer } from '@repo/e2e/real-server';
import { realAgentCondition } from './manifest.mts';
import type { RealAgentChoice } from './real-agent-choice.mts';
import {
  installRealAgent,
  newPinnedSession,
  pinCostOrFail,
  realProjectId,
} from './real-agent-session.mts';
import type { SeedLauncher } from './seed-launcher.mts';
import type { SeedOptions } from './seed-options.mts';
import { type SeededServer, seedWith } from './seed.mts';

/*
 * A seeded Server that drives a real Agent.
 *
 * The seed is the same as every other run's: one real Session, cloned into many Sessions and into
 * copies of the recorded Feeds, so the Feed a scenario scrolls is the same Feed the fixture runs
 * scroll. What differs is the Server under it — the shipped Engine, the published Registry, and an
 * Agent the owner is signed in to — and the Session rows it clones, which carry the real Agent and
 * the configuration the template Session was pinned to.
 */

/*
 * The template Session: created on the real Agent, pinned at creation and proved pinned, and never
 * prompted. It exists so the seed has Server-written columns to clone, and a Turn on it would bill
 * the owner for nothing the run measures. Proving the pin here fails a misconfigured run before it
 * has seeded anything.
 */
async function pinnedTemplateSession(
  httpUrl: string,
  choice: RealAgentChoice,
): Promise<void> {
  await installRealAgent(httpUrl, choice);
  const projectId = await realProjectId(httpUrl);
  const sessionId = await newPinnedSession(httpUrl, choice, projectId);
  await pinCostOrFail(httpUrl, choice.pin, sessionId);
}

const templateLauncher = (choice: RealAgentChoice) =>
  async function template(directory: string): Promise<void> {
    await prepareRealProject(directory);
    const server = await startRealServer(directory);

    try {
      await pinnedTemplateSession(server.httpUrl, choice);
    } finally {
      await server.stop();
    }
  };

export const realAgentLauncher = (choice: RealAgentChoice): SeedLauncher => ({
  template: templateLauncher(choice),
  start: startRealServer,
  agent: realAgentCondition(choice),
});

export const startRealAgentServer = (
  choice: RealAgentChoice,
  directory: string,
  options?: SeedOptions,
): Promise<SeededServer> =>
  seedWith(realAgentLauncher(choice), directory, options);
