import { errors } from '@playwright/test';
import { describe, expect, it } from 'vitest';
import { cancelTurn, type StopButton } from './soak-cycle.mts';
import type { Activity } from './soak-state.mts';

const noActivity = (): Activity => ({
  cycles: 0,
  turns: 0,
  cancellationsAttempted: 0,
  cancellationsObserved: 0,
});

const pressed = async (): Promise<void> => {};

const timedOut = async (): Promise<void> => {
  throw new errors.TimeoutError('Stop detached');
};

const closed = async (): Promise<void> => {
  throw new Error('Target closed');
};

// A Stop button that clicks as the test says and is drawn this many times afterwards.
const stopButton = (click: () => Promise<void>, drawn: number): StopButton => ({
  click,
  count: async () => drawn,
});

describe('a soak cancelling a Turn', () => {
  it('counts a Stop it pressed as an observed cancellation', async () => {
    const activity = noActivity();

    await cancelTurn(stopButton(pressed, 1), activity);

    expect(activity).toMatchObject({
      cancellationsAttempted: 1,
      cancellationsObserved: 1,
    });
  });

  it('carries on when the Turn finished before Stop could be pressed', async () => {
    const activity = noActivity();

    await cancelTurn(stopButton(timedOut, 0), activity);

    expect(activity).toMatchObject({
      cancellationsAttempted: 1,
      cancellationsObserved: 0,
    });
  });

  it('fails when Stop is still drawn but could not be pressed', async () => {
    await expect(
      cancelTurn(stopButton(timedOut, 1), noActivity()),
    ).rejects.toThrow('Stop detached');
  });

  it('fails on an error that is not a timeout even when Stop is gone', async () => {
    await expect(
      cancelTurn(stopButton(closed, 0), noActivity()),
    ).rejects.toThrow('Target closed');
  });
});
