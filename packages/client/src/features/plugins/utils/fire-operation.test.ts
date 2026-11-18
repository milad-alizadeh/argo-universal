import { describe, expect, it, vi } from 'vitest';
import { fireOperation } from './fire-operation';
import type { OperationRunner } from './page-calls-ports';

const scoped = {
  pluginId: 'github',
  operation: 'detach',
  args: {},
  projectId: 'project-1',
  sessionId: 'session-1',
};

const answers = (): ReturnType<OperationRunner['run']> =>
  Promise.resolve({ result: null });

describe('fireOperation', () => {
  it('runs the Operation and says nothing when it resolves', async () => {
    const run = vi.fn<OperationRunner['run']>(() =>
      Promise.resolve({ result: null }),
    );

    const failed = vi.fn<OperationRunner['failed']>();

    fireOperation({ run, failed })(scoped);
    await Promise.resolve();

    expect(run).toHaveBeenCalledWith(scoped);
    expect(failed).not.toHaveBeenCalled();
  });

  it('says an Error rejection once, as it is', async () => {
    const error = new Error('refused');
    const failed = vi.fn<OperationRunner['failed']>();

    fireOperation({ run: () => Promise.reject(error), failed })(scoped);
    await vi.waitFor(() => expect(failed).toHaveBeenCalledTimes(1));

    expect(failed).toHaveBeenCalledWith(error);
  });

  it('tells a caller that asked when the Operation answered', async () => {
    const settled = vi.fn<(answered: boolean) => void>();
    const failed = vi.fn<OperationRunner['failed']>();

    fireOperation({ run: answers, failed })(scoped, settled);
    await vi.waitFor(() => expect(settled).toHaveBeenCalledWith(true));

    expect(settled).toHaveBeenCalledTimes(1);
    expect(failed).not.toHaveBeenCalled();
  });

  it('tells a caller that asked when the Operation failed, and still says why', async () => {
    const error = new Error('refused');
    const settled = vi.fn<(answered: boolean) => void>();
    const failed = vi.fn<OperationRunner['failed']>();

    fireOperation({ run: () => Promise.reject(error), failed })(
      scoped,
      settled,
    );
    await vi.waitFor(() => expect(failed).toHaveBeenCalledWith(error));

    expect(settled).toHaveBeenCalledTimes(1);
    expect(settled).toHaveBeenCalledWith(false);
  });

  it('says a non-Error rejection once, as an Error', async () => {
    const failed = vi.fn<OperationRunner['failed']>();

    fireOperation({ run: () => Promise.reject('refused'), failed })(scoped);
    await vi.waitFor(() => expect(failed).toHaveBeenCalledTimes(1));

    expect(failed).toHaveBeenCalledWith(new Error('refused'));
  });
});
