import type { AgentOptionsUpdate, SessionConfigOption } from '@repo/contracts';
import { recordedSessionOptions } from '@repo/mocks/app';
import { describe, expect, it } from 'vitest';
import { SessionOptionsState } from './session-options-state';

const choice = { agent: 'agent-one', projectId: 'project-a' };

const recorded = recordedSessionOptions(choice.agent);

const update: AgentOptionsUpdate = {
  ...choice,
  configOptions: recorded,
  commands: [],
};

const fresh = (): SessionOptionsState => new SessionOptionsState(choice);

const loaded = (): SessionOptionsState =>
  fresh().receive(fresh().owner, update);

const current = (
  state: SessionOptionsState,
  configId: string,
): string | boolean | undefined =>
  state.snapshot().configOptions.find((option) => option.configId === configId)
    ?.currentValue;

describe('Agent options state', () => {
  it('keeps the owned snapshot while a pick restarts discovery', () => {
    const picked = loaded().pick('model', 'haiku');

    const refreshing = picked.receive(picked.owner, {
      ...update,
      configOptions: null,
      stage: 'loading',
    });

    expect(current(refreshing, 'model')).toBe('haiku');
    expect(refreshing.snapshot().loading).toBe(false);
    expect(refreshing.snapshot().stage).toBe('loading');
  });

  it('drops old options and picks when the Agent, Project or Session changes', () => {
    const picked = loaded().pick('model', 'haiku');

    for (const next of [
      { ...choice, agent: 'other' },
      { ...choice, projectId: 'other' },
      { ...choice, sessionId: 'session' },
    ]) {
      const changed = picked.forChoice(next);
      expect(changed.picks).toEqual({});
      expect(changed.snapshot()).toMatchObject({
        configOptions: [],
        loading: true,
      });
      expect(changed.snapshot().commands).toBeUndefined();
      expect(changed.receive(picked.owner, update)).toBe(changed);
    }
  });

  it('shows loading before the first update, but accepts an empty saved snapshot as settled', () => {
    expect(fresh().snapshot().loading).toBe(true);

    const empty = fresh().receive(fresh().owner, {
      ...update,
      configOptions: [],
    });

    expect(empty.snapshot()).toMatchObject({
      configOptions: [],
      loading: false,
    });
    expect(
      new SessionOptionsState({
        agent: undefined,
        projectId: undefined,
      }).snapshot().loading,
    ).toBe(false);
  });

  it('retains options through a recoverable failure and clears it on a live update', () => {
    const error = { type: 'auth-required' as const };

    const failed = loaded().receive(loaded().owner, {
      ...update,
      configOptions: null,
      error,
    });

    expect(failed.snapshot()).toMatchObject({
      error,
      loading: false,
      configOptions: recorded,
    });
    expect(
      failed.receive(failed.owner, update).snapshot().error,
    ).toBeUndefined();
  });

  it('settles failed initial discovery without a snapshot', () => {
    const error = { type: 'auth-required' as const };
    expect(fresh().snapshot({ error })).toMatchObject({
      configOptions: [],
      loading: false,
      error,
    });
  });

  it('applies offered picks and drops a pick the refreshed Agent no longer offers', () => {
    expect(current(loaded().pick('model', 'haiku'), 'model')).toBe('haiku');
    expect(current(loaded().pick('model', 'retired-model'), 'model')).toBe(
      'default',
    );
  });

  it('resets other unsent picks when the model changes', () => {
    const picked = loaded()
      .pick('mode', 'plan')
      .pick('effort', 'high')
      .pick('model', 'haiku');

    expect(picked.picks).toEqual({ model: 'haiku' });
    const initial = picked.snapshot().configuration.initial;
    expect(initial.map((option) => option.configId)).toEqual([
      'model',
      'effort',
      'mode',
    ]);
    expect(initial.find((option) => option.configId === 'model')).toMatchObject(
      { value: 'haiku', optional: false },
    );
    expect(initial.find((option) => option.configId === 'mode')).toMatchObject({
      optional: true,
    });
  });

  it('prefers live Session options and falls back to discovery when no live schema is available', () => {
    const live: SessionConfigOption[] = recorded.map((option) =>
      option.type === 'boolean' ? option : { ...option, currentValue: 'live' },
    );

    expect(loaded().snapshot({ liveConfigOptions: live })).toMatchObject({
      configOptions: live,
      loading: false,
    });
    expect(loaded().snapshot({ liveConfigOptions: [] }).configOptions).toEqual(
      recorded,
    );
  });
});
