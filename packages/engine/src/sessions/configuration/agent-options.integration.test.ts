import { realpathSync } from 'node:fs';
import {
  type CloseSessionRequest,
  type NewSessionRequest,
  type PromptRequest,
} from '@agentclientprotocol/sdk';
import { agentOptions, project, session } from '@repo/db/schema';
import { fixtureAgents } from '@repo/mocks/agent/app-fixtures';
import { readSessionCheckouts } from '@repo/mocks/git/test-repository';
import { eq } from 'drizzle-orm';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import {
  collectOptions,
  optionsSessionId,
  optionsInput,
  optionsScenario,
} from './agent-options.test.mocks';

function requireProjectPath(path: string | undefined): string {
  if (!path) throw new Error('The fixture Project has no folder');

  return path;
}

it.each(fixtureAgents.map(({ agent }) => agent))(
  '%s offers its options before Send from an Agent session it closes, leaving no Session or worktree',
  async (agent) => {
    const openings: NewSessionRequest[] = [];
    const closes: CloseSessionRequest[] = [];
    const prompts: PromptRequest[] = [];

    const scenario = optionsScenario(closes, { requests: openings });

    const host = await startAcpEngine(
      {
        ...scenario,
        responses: {
          ...scenario.responses,
          'session/prompt': [{ requests: prompts }],
        },
      },
      undefined,
      agent,
    );

    const storedSessions = (): { id: string }[] =>
      host.database.select({ id: session.id }).from(session).all();

    const before = storedSessions();

    const options = await collectOptions(
      host.caller.session.agentOptions(optionsInput(agent)),
    );

    const projectPath = requireProjectPath(
      host.database
        .select({ path: project.path })
        .from(project)
        .where(eq(project.id, emptySessionInput.projectId))
        .get()?.path,
    );

    expect(
      options.map(({ configId, currentValue }) => [configId, currentValue]),
    ).toEqual([
      ['model', 'large'],
      ['effort', 'high'],
      ['mode', 'code'],
      ['fast', false],
    ]);
    expect(openings.map(({ cwd }) => realpathSync(cwd))).toEqual([
      realpathSync(projectPath),
    ]);
    expect(closes).toEqual([{ sessionId: optionsSessionId }]);
    expect(prompts).toEqual([]);
    expect(
      host.database.select().from(agentOptions).get()?.configOptions,
    ).toEqual(options);
    expect(storedSessions()).toEqual(before);
    expect(await readSessionCheckouts(projectPath)).toEqual({
      branches: [],
      worktrees: 1,
    });
  },
);

it('refuses the options of an Agent that is not installed, opening nothing', async () => {
  const openings: NewSessionRequest[] = [];

  const host = await startAcpEngine({
    steps: [],
    responses: { 'session/new': [{ requests: openings }] },
  });

  await expect(
    collectOptions(
      host.caller.session.agentOptions(optionsInput('not-installed')),
    ),
  ).rejects.toThrow('Agent "not-installed" is not installed.');
  expect(openings).toEqual([]);
});
