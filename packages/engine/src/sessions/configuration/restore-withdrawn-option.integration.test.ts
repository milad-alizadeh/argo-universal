import type {
  PromptRequest,
  SessionConfigOption,
} from '@agentclientprotocol/sdk';
import { InitialConfigOption } from '@repo/contracts';
import { session } from '@repo/db/schema';
import { eq } from 'drizzle-orm';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import { closeTestSession } from '#mocks/close-session';
import { configuration } from './restore.test.mocks';

// An option an Agent offers only some of the time, as Claude offers its Agent persona only while it finds custom agents.
const persona: SessionConfigOption = {
  id: 'agent',
  name: 'Agent',
  type: 'select',
  currentValue: 'default',
  options: [
    { value: 'default', name: 'Default' },
    { value: 'reviewer', name: 'reviewer' },
  ],
};

it('reopens and prompts when the Agent withdrew an option the Session saved, and stops saving it', async () => {
  const prompts: PromptRequest[] = [];

  const host = await startAcpEngine({
    steps: [],
    configOptions: [...configuration, persona],
    responses: {
      'session/prompt': [{ requests: prompts }, { requests: prompts }],
      'session/resume': [{ result: { configOptions: configuration } }],
    },
  });

  const created = await host.caller.session.new({
    ...emptySessionInput,
    prompt: [{ type: 'text', text: 'First' }],
  });

  const savedChoices = (): InitialConfigOption[] =>
    InitialConfigOption.array().parse(
      host.database
        .select()
        .from(session)
        .where(eq(session.id, created.sessionId))
        .get()?.configValues,
    );

  await waitForAcpSessionIdle(host, created.sessionId);
  expect(savedChoices()).toContainEqual({
    configId: 'agent',
    value: 'default',
  });
  await closeTestSession(host, created);
  await host.caller.session.open(created);
  await host.caller.session.prompt({
    ...created,
    prompt: [{ type: 'text', text: 'continue' }],
  });
  await waitForAcpSessionIdle(host, created.sessionId);

  expect(prompts).toHaveLength(2);
  expect(savedChoices()).not.toContainEqual(
    expect.objectContaining({ configId: 'agent' }),
  );
});
