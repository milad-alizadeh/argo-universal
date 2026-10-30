import { type NewSessionRequest } from '@agentclientprotocol/sdk';
import { AgentConfiguration, type SessionConfigOption } from '@repo/contracts';
import { agentOptions, session } from '@repo/db/schema';
import { acpConfiguration } from '@repo/mocks/agent/acp-configuration';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import {
  collectOptions,
  readySessionOptions,
  optionsInput,
  optionsScenario,
} from './agent-options.test.mocks';

function modelValue(
  options: SessionConfigOption[],
): SessionConfigOption['currentValue'] | undefined {
  return options.find((option) => option.configId === 'model')?.currentValue;
}

it('does not recreate saved options when the Agent is removed during discovery', async () => {
  const received = Promise.withResolvers<NewSessionRequest>();
  const release = Promise.withResolvers<void>();

  const host = await startAcpEngine(
    optionsScenario([], { received, waitFor: release.promise }),
  );

  const discovery = collectOptions(
    host.caller.session.agentOptions(optionsInput()),
  );

  // Removing an Agent drops its connection, so discovery may be cancelled before its reply.
  const settled = discovery.catch(() => []);
  await received.promise;
  await host.caller.agent.remove({ id: emptySessionInput.agent });
  release.resolve();
  await settled;
  expect(host.database.select().from(agentOptions).all()).toEqual([]);
  expect(await host.caller.agent.list()).toEqual([]);
});

it('refreshes model-dependent options before Send without creating a Session', async () => {
  const changed = acpConfiguration
    .filter((option) => option.category === 'model')
    .map((option) =>
      option.type === 'select' ? { ...option, currentValue: 'small' } : option,
    );

  const host = await startAcpEngine({
    steps: [],
    configOptions: acpConfiguration,
    responses: {
      'session/set_config_option': [{ result: { configOptions: changed } }],
    },
  });

  const sessionsBefore = host.database.select().from(session).all();

  const options = await collectOptions(
    host.caller.session.agentOptions({
      ...optionsInput(),
      picks: { model: 'small' },
    }),
  );

  expect(options.map((option) => option.category)).toEqual(['model']);
  expect(options[0]?.currentValue).toBe('small');
  expect(host.database.select().from(session).all()).toEqual(sessionsBefore);
  expect(
    host.database.select().from(agentOptions).get()?.configOptions,
  ).toEqual(options);
});

it('reads a closed Session configuration without resuming it or replacing New Session preferences', async () => {
  const resumes: object[] = [];

  const host = await startAcpEngine({
    steps: [],
    configOptions: acpConfiguration,
    responses: { 'session/resume': [{ requests: resumes }] },
  });

  const created = await host.caller.session.new({
    ...emptySessionInput,
    prompt: [{ type: 'text', text: 'Keep this Session' }],
  });

  await host.caller.session.close(created);
  // Another Session changed the Agent's most recent preferences.
  await collectOptions(
    host.caller.session.agentOptions({
      ...optionsInput(),
      picks: { model: 'small' },
    }),
  );

  const restored = await readySessionOptions(
    host.caller.session.agentOptions({
      ...optionsInput(),
      sessionId: created.sessionId,
    }),
  );

  expect(modelValue(restored)).toBe('large');
  expect(resumes).toEqual([]);
  const recent = host.database.select().from(agentOptions).get()?.configOptions;
  expect(modelValue(AgentConfiguration.shape.configOptions.parse(recent))).toBe(
    'small',
  );
});
