import { Button } from '@repo/kit/primitives/actions/button';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { View } from 'react-native';
import {
  type MockInstance,
  expect,
  fn,
  spyOn,
  userEvent,
  waitFor,
} from 'storybook/test';
import {
  type RestorableList,
  useRestoreFeedAnchor,
} from './use-restore-feed-anchor';

// Legend List's cancelScroll calls flushSync when the scroll it settles on is more than a viewport away (#1977).
const cancelScroll = fn(() => flushSync(() => {}));

// Its scroll to the end never settles, so the restoration is still running when the Feed hides.
const openingList: RestorableList = {
  scrollToEnd: () => new Promise<void>(() => {}),
  cancelScroll,
  scrollToKey: () => Promise.resolve(),
  anchorVisibleContent: () => ({ key: 'first', offset: 0 }),
};

function RestoringFeed(): React.JSX.Element {
  const [shown, setShown] = useState(true);
  const list = useRef<RestorableList | null>(openingList);
  const { open } = useRestoreFeedAnchor(list, shown);

  useEffect(() => open(null), [open]);

  return (
    <View>
      <Button label="Hide the Feed" onPress={() => setShown(false)} />
    </View>
  );
}

const meta = {
  title: 'Tests/Feed/UseRestoreFeedAnchor',
  component: RestoringFeed,
  tags: ['!autodocs'],
} satisfies Meta<typeof RestoringFeed>;

export default meta;

type Story = StoryObj<typeof meta>;

let consoleErrors: MockInstance<typeof console.error>;

const flushSyncErrors = (): unknown[] =>
  consoleErrors.mock.calls
    .flat()
    .filter((part) => typeof part === 'string' && part.includes('flushSync'));

export const HidingTheFeedCancelsItsScrollOutsideReactsCommit: Story = {
  beforeEach: () => {
    cancelScroll.mockClear();
    consoleErrors = spyOn(console, 'error');

    return (): void => consoleErrors.mockRestore();
  },
  play: async ({ canvas }) => {
    await userEvent.click(
      await canvas.findByRole('button', { name: 'Hide the Feed' }),
    );

    await waitFor(() => expect(cancelScroll).toHaveBeenCalledOnce());
    await expect(flushSyncErrors()).toEqual([]);
  },
};
