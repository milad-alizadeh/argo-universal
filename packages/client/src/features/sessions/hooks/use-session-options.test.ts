import type { SessionConfigOption } from '@repo/contracts';
import { recordedSessionOptions } from '@repo/mocks/app';
import {
  dehydrate,
  type MutationState,
  QueryClient,
} from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { persistOnly } from '../../../lib/product/query-persister';
import {
  sessionOptions,
  sessionOptionsKey,
  sessionOptionsQuery,
  writeSessionOptions,
} from './use-session-options';

const agent = 'agent-one';

const projectId = 'project-a';

const recorded = recordedSessionOptions(agent);

const current = (
  options: SessionConfigOption[],
  configId: string,
): string | boolean | undefined =>
  options.find((option) => option.configId === configId)?.currentValue;

// The model's own values, written out from the recording.
const withModel = (value: string): SessionConfigOption[] =>
  recorded.map((option) =>
    option.type === 'select' && option.configId === 'model'
      ? { ...option, currentValue: value }
      : option,
  );

const choice = { agent, projectId, saved: {}, picks: {}, opening: false };

const cached = (client: QueryClient): SessionConfigOption[] | undefined =>
  client.getQueryData(sessionOptionsQuery(agent, projectId).queryKey);

describe('the Session options cache', () => {
  it('shows the cached options, then the next opened Session’s options', () => {
    const client = new QueryClient();
    writeSessionOptions(client, { agent, projectId }, withModel('haiku'));
    expect(
      current(sessionOptions(cached(client), choice).configOptions, 'model'),
    ).toBe('haiku');

    writeSessionOptions(
      client,
      { agent, projectId },
      withModel('agent-one-opus-4-6'),
    );

    expect(
      current(sessionOptions(cached(client), choice).configOptions, 'model'),
    ).toBe('agent-one-opus-4-6');
  });

  it('shows a pick the options still offer', () => {
    const { configOptions } = sessionOptions(recorded, {
      ...choice,
      picks: { model: 'haiku' },
    });

    expect(current(configOptions, 'model')).toBe('haiku');
  });

  it('falls back to the Agent’s default when a pick is no longer offered', () => {
    const { configOptions } = sessionOptions(recorded, {
      ...choice,
      picks: { model: 'retired-model' },
    });

    expect(current(configOptions, 'model')).toBe('default');
  });

  it('falls back to the Agent’s default when a saved choice is no longer offered', () => {
    const { configOptions } = sessionOptions(recorded, {
      ...choice,
      saved: { mode: 'retired-mode' },
    });

    expect(current(configOptions, 'mode')).toBe('default');
  });

  it.each([
    { written: false, opening: true, loading: true },
    { written: false, opening: false, loading: false },
    { written: true, opening: true, loading: false },
  ])(
    'shows Loading only while a Local Session opens and nothing was ever written: %o',
    ({ written, opening, loading }) => {
      expect(
        sessionOptions(written ? recorded : undefined, { ...choice, opening }),
      ).toMatchObject({ loading });
    },
  );

  it('shows the Agent’s defaults, no options, when nothing was ever written', () => {
    expect(sessionOptions(undefined, choice).configOptions).toEqual([]);
  });

  it('persists the Session options and no other query', () => {
    const client = new QueryClient();
    writeSessionOptions(client, { agent, projectId }, recorded);
    client.setQueryData(['system.info'], { name: 'Server' });

    const persisted = dehydrate(client, persistOnly(sessionOptionsKey));

    expect(persisted.queries.map(({ queryKey }) => queryKey)).toEqual([
      [sessionOptionsKey, agent, projectId],
    ]);
  });

  // A prompt sent while the Connection was down, as TanStack Query holds it.
  const pausedPrompt: MutationState = {
    context: undefined,
    data: undefined,
    error: null,
    failureCount: 0,
    failureReason: null,
    isPaused: true,
    status: 'pending',
    variables: 'Fix the flaky login test',
    submittedAt: 0,
  };

  it('persists no paused mutation', () => {
    const client = new QueryClient();
    client.getMutationCache().build(client, {}, pausedPrompt);

    const persisted = dehydrate(client, persistOnly(sessionOptionsKey));

    expect(persisted.mutations).toEqual([]);
  });
});
