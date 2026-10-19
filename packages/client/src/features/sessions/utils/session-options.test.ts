import type { SessionConfigOption } from '@repo/contracts';
import { recordedSessionOptions } from '@repo/mocks/app';
import { describe, expect, it } from 'vitest';
import { sessionOptions } from './session-options';

const agent = 'agent-one';

const projectId = 'project-a';

const recorded = recordedSessionOptions(agent);

const current = (
  options: SessionConfigOption[],
  configId: string,
): string | boolean | undefined =>
  options.find((option) => option.configId === configId)?.currentValue;

const choice = { agent, projectId, saved: {}, picks: {}, opening: false };

describe('Server options and unsent picks', () => {
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
    'shows Loading only while discovery runs and no snapshot is available: %o',
    ({ written, opening, loading }) => {
      expect(
        sessionOptions(written ? recorded : undefined, { ...choice, opening }),
      ).toMatchObject({ loading });
    },
  );

  it('does not show loading for a saved empty option list', () => {
    expect(sessionOptions([], { ...choice, opening: true }).loading).toBe(
      false,
    );
  });

  it('shows the Agent’s defaults, no options, when nothing was ever written', () => {
    expect(sessionOptions(undefined, choice).configOptions).toEqual([]);
  });
});
