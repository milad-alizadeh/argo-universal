import { describe, expect, it, type Mock, vi } from 'vitest';
import type { SessionPullRequest } from '#features/sessions';
import {
  type RowActionPorts,
  withRowActions,
} from './session-pull-request-actions';

const change: SessionPullRequest = {
  stage: 'open',
  number: 12,
  title: 'Add the thing',
  mergeable: true,
  repository: 'owner/app',
  url: 'https://github.com/owner/app/pull/12',
};

const scope = { projectId: 'project-1', sessionId: 'session-1' };

type Run = RowActionPorts['run'];

function ports(overrides: { run?: Run } = {}): RowActionPorts & {
  run: Mock<Run>;
  failed: Mock<RowActionPorts['failed']>;
  copy: Mock<RowActionPorts['copy']>;
} {
  return {
    scope,
    run: vi.fn<Run>(overrides.run ?? (() => Promise.resolve({ result: null }))),
    failed: vi.fn<RowActionPorts['failed']>(),
    copy: vi.fn<RowActionPorts['copy']>(() => Promise.resolve(true)),
  };
}

describe('withRowActions', () => {
  it("Detach runs the GitHub Plugin's detach for that PR, in the Session's scope", () => {
    const kit = ports();
    const [first] = withRowActions([change], kit);

    first?.onDetach?.();

    expect(kit.run).toHaveBeenCalledWith({
      pluginId: 'github',
      operation: 'detach',
      args: { reference: 'owner/app#12' },
      ...scope,
    });
  });

  it("Copy link copies the PR's address", () => {
    const kit = ports();
    const [first] = withRowActions([change], kit);

    first?.onCopyLink?.();

    expect(kit.copy).toHaveBeenCalledWith(
      'https://github.com/owner/app/pull/12',
    );
  });

  it('says why a Detach failed', async () => {
    const error = new Error('refused');
    const kit = ports({ run: () => Promise.reject(error) });
    const [first] = withRowActions([change], kit);

    first?.onDetach?.();
    await vi.waitFor(() => expect(kit.failed).toHaveBeenCalledWith(error));
  });

  it('offers no Detach for a PR whose repository is unknown, and no Copy link without an address', () => {
    const [first] = withRowActions(
      [{ ...change, repository: undefined, url: undefined }],
      ports(),
    );

    expect(first?.onDetach).toBeUndefined();
    expect(first?.onCopyLink).toBeUndefined();
  });
});
