import { realpathSync } from 'node:fs';
import type {
  CloseSessionRequest,
  NewSessionRequest,
  PromptRequest,
} from '@agentclientprotocol/sdk';
import { project, session } from '@repo/db/schema';
import { acpConfiguration } from '@repo/mocks/agent/acp-configuration';
import { fixtureAgents } from '@repo/mocks/agent/app-fixtures';
import { readSessionCheckouts } from '@repo/mocks/git/test-repository';
import { eq } from 'drizzle-orm';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';

const optionsSessionId = 'options-session';

it.each(fixtureAgents.map(({ agent }) => agent))(
  '%s offers its options before Send from an ACP session it closes, leaving no Session or worktree',
  async (agent) => {
    const openings: NewSessionRequest[] = [];
    const closes: CloseSessionRequest[] = [];
    const prompts: PromptRequest[] = [];

    const host = await startAcpEngine(
      {
        steps: [],
        responses: {
          'session/new': [
            {
              requests: openings,
              result: {
                sessionId: optionsSessionId,
                configOptions: acpConfiguration,
              },
            },
          ],
          'session/close': [{ requests: closes }],
          'session/prompt': [{ requests: prompts }],
        },
      },
      undefined,
      agent,
    );

    const storedSessions = (): { id: string }[] =>
      host.database.select({ id: session.id }).from(session).all();

    const before = storedSessions();

    const options = await host.caller.session.agentOptions({
      projectId: emptySessionInput.projectId,
      agent,
    });

    const projectPath = host.database
      .select({ path: project.path })
      .from(project)
      .where(eq(project.id, emptySessionInput.projectId))
      .get()?.path;

    if (!projectPath) throw new Error('The fixture Project has no folder');
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
    host.caller.session.agentOptions({
      projectId: emptySessionInput.projectId,
      agent: 'not-installed',
    }),
  ).rejects.toThrow('Agent "not-installed" is not installed.');
  expect(openings).toEqual([]);
});
