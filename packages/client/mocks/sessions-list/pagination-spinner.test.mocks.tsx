import type * as React from 'react';
import { useCallback, useRef, useState } from 'react';
import { View } from 'react-native';
import { expect, waitFor } from 'storybook/test';
import { SessionsList } from '../../src/features/sessions/components/sessions-list/sessions-list';
import { largeSessions } from '../../src/features/sessions/components/sessions-list/sessions-list.mocks';
import { settleViewport } from '../../src/lib/generic/settle-viewport';
import {
  delayFooterLayout,
  getDelayedFooterLayouts,
} from './delayed-footer-layout.test.mocks';
import {
  sessionsScrollId,
  type Story,
} from './sessions-list-story-context.test.mocks';

const pageLength = 20;

type PageHold = { current: Promise<void> | undefined };

const heldUntilReleased = (hold: PageHold): Promise<void> =>
  hold.current ?? Promise.resolve();

// A list that fetches the next page of Sessions when the end is reached, held until released.
function PagedList({
  args,
  hold,
}: {
  args: React.ComponentProps<typeof SessionsList>;
  hold: { current: Promise<void> | undefined };
}): React.JSX.Element {
  const [count, setCount] = useState(pageLength);
  const [fetching, setFetching] = useState(false);
  const fetchingRef = useRef(false);
  const loadMore = useCallback(() => {
    if (fetchingRef.current || count >= largeSessions.length) return;
    fetchingRef.current = true;
    setFetching(true);
    void heldUntilReleased(hold).then(() => {
      setCount((current) => current + pageLength);
      fetchingRef.current = false;
      setFetching(false);
    });
  }, [count, hold]);
  return (
    <View className="flex-1 w-full wide:w-shell-list" style={{ minHeight: 0 }}>
      <SessionsList
        {...args}
        sessions={largeSessions.slice(0, count)}
        isFetchingNextPage={fetching}
        onEndReached={loadMore}
      />
    </View>
  );
}

const heldPage: { current: Promise<void> | undefined } = {
  current: undefined,
};
let releasePage: (() => void) | undefined;

export const paginationSpinnerVisible: Story = {
  beforeEach: async () => {
    heldPage.current = undefined;
    const restore = delayFooterLayout();
    await settleViewport(390);
    return () => {
      releasePage?.();
      heldPage.current = undefined;
      restore();
    };
  },
  parameters: { screenPreview: true },
  render: (args) => <PagedList args={args} hold={heldPage} />,
  play: async ({ canvas }) => {
    const scroll = await canvas.findByTestId(sessionsScrollId);
    await waitFor(() =>
      expect(scroll.scrollHeight).toBeGreaterThan(scroll.clientHeight),
    );
    const initialHeight = scroll.scrollHeight;
    heldPage.current = new Promise<void>((resolve) => {
      releasePage = resolve;
    });
    scroll.scrollTop = initialHeight;
    const spinner = await canvas.findByRole('progressbar', {
      name: 'Loading more Sessions',
    });
    await waitFor(() => expect(getDelayedFooterLayouts()).toBeGreaterThan(0));
    await waitFor(
      async () => {
        const viewport = scroll.getBoundingClientRect();
        const indicator = spinner.getBoundingClientRect();
        await expect(indicator.top).toBeGreaterThanOrEqual(viewport.top);
        await expect(indicator.bottom).toBeLessThanOrEqual(viewport.bottom);
      },
      { timeout: 1000 },
    );
    releasePage?.();
    await waitFor(
      () => expect(canvas.queryByRole('progressbar')).not.toBeInTheDocument(),
      { timeout: 3000 },
    );
    await waitFor(() =>
      expect(scroll.scrollHeight).toBeGreaterThan(initialHeight),
    );
  },
};
