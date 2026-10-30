import { type NewSessionRequest, RequestError } from '@agentclientprotocol/sdk';
import type { SessionConfigOption } from '@repo/contracts';
import { agentOptions } from '@repo/db/schema';
import { acpConfiguration } from '@repo/mocks/agent/acp-configuration';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { collectOptions, optionsInput } from './agent-options.test.mocks';

function explicitPicks(
  model: string | undefined,
): { model: string } | undefined {
  return model ? { model } : undefined;
}

function modelValue(
  options: SessionConfigOption[],
): SessionConfigOption['currentValue'] | undefined {
  return options.find((option) => option.category === 'model')?.currentValue;
}

function expectedModel(model: string | undefined): string {
  return model ?? 'small';
}

function hasThoughtLevel(options: SessionConfigOption[]): boolean {
  return options.some((option) => option.category === 'thought_level');
}

it.each([undefined, 'large'])(
  'preserves newer saved options while discovery returns its explicit pick %s',
  async (model) => {
    const received = Promise.withResolvers<NewSessionRequest>();
    const release = Promise.withResolvers<void>();

    const changed = acpConfiguration
      .filter((option) => option.category === 'model')
      .map((option) =>
        option.id === 'model' && option.type === 'select'
          ? { ...option, currentValue: 'small' }
          : option,
      );

    const host = await startAcpEngine({
      steps: [],
      configOptions: acpConfiguration,
      responses: {
        'session/new': [
          { result: { sessionId: 'actual', configOptions: acpConfiguration } },
          {
            received,
            waitFor: release.promise,
            result: { sessionId: 'discovery', configOptions: acpConfiguration },
          },
        ],
        'session/set_config_option': [{ result: { configOptions: changed } }],
      },
    });

    const created = await host.caller.session.new(emptySessionInput);

    const stream = (
      await host.caller.session.agentOptions({
        ...optionsInput(),
        picks: explicitPicks(model),
      })
    )[Symbol.asyncIterator]();

    expect((await stream.next()).value?.configOptions).not.toBeNull();

    const refreshing = collectOptions(
      Promise.resolve({ [Symbol.asyncIterator]: () => stream }),
    );

    await received.promise;

    const applied = await host.caller.session.setConfigOption({
      ...created,
      configId: 'model',
      type: 'id',
      value: 'small',
    });

    release.resolve();
    const refreshed = await refreshing;
    expect(modelValue(refreshed)).toBe(expectedModel(model));
    expect(hasThoughtLevel(refreshed)).toBe(model !== undefined);
    await expect
      .poll(
        () => host.database.select().from(agentOptions).get()?.configOptions,
      )
      .toEqual(applied.configOptions);
    await stream.return?.();
  },
);

it('keeps saved options but reports sign-in when background discovery fails', async () => {
  const host = await startAcpEngine({
    steps: [],
    responses: {
      'session/new': [
        { result: { sessionId: 'first', configOptions: acpConfiguration } },
        { error: RequestError.authRequired().toErrorResponse() },
      ],
    },
  });

  const saved = await collectOptions(
    host.caller.session.agentOptions(optionsInput()),
  );

  const stream = (await host.caller.session.agentOptions(optionsInput()))[
    Symbol.asyncIterator
  ]();

  expect((await stream.next()).value?.configOptions).toEqual(saved);
  await expect(stream.next()).rejects.toMatchObject({
    cause: { openError: { type: 'auth-required' } },
  });
  expect(
    host.database.select().from(agentOptions).get()?.configOptions,
  ).toEqual(saved);
});
