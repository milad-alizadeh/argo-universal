import { describe, expect, it, vi } from 'vitest';
import type { SessionPullRequest } from '#features/sessions';
import { pullRequestMocks } from '../../../../features/sessions/components/session-pull-request.mocks';
import { withCheckoutFiles } from './checkout-files';

const onCheckout: SessionPullRequest = {
  ...pullRequestMocks.checksRunning,
  onCheckout: true,
};

const elsewhere: SessionPullRequest = pullRequestMocks.checksRunning;

describe("a Change row's files", () => {
  it("open the Checkout's Changes against main for the Change on the Checkout", () => {
    const onComparisonChange = vi.fn();
    const open = vi.fn();
    const [change] = withCheckoutFiles([onCheckout], onComparisonChange, open);

    change?.onOpenFiles?.();

    expect(onComparisonChange).toHaveBeenCalledWith({ kind: 'main' });
    expect(open).toHaveBeenCalledTimes(1);
  });

  it('open nothing for a pull request that is not the Checkout', () => {
    const [change] = withCheckoutFiles([elsewhere], vi.fn(), vi.fn());

    expect(change?.onOpenFiles).toBeUndefined();
  });

  it('open nothing until the Changes have loaded', () => {
    const [change] = withCheckoutFiles([onCheckout], undefined, vi.fn());

    expect(change?.onOpenFiles).toBeUndefined();
  });
});
