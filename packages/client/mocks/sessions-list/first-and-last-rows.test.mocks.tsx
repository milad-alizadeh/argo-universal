import { settleViewport } from '@repo/kit/settle-viewport';
import { View } from 'react-native';
import { expect, waitFor } from 'storybook/test';
import { SessionsList } from '../../src/features/sessions/components/sessions-list/sessions-list';
import { largeSessions } from '../../src/features/sessions/components/sessions-list/sessions-list.mocks';
import {
  exampleProjectName,
  sessionsScrollId,
  type Story,
} from './sessions-list-story-context.test.mocks';

export const firstAndLastRowsReachable: Story = {
  parameters: { screenPreview: true },
  render: (args) => (
    <View className="flex-1 w-full wide:w-frame-list" style={{ minHeight: 0 }}>
      <SessionsList {...args} sessions={largeSessions.slice(0, 12)} />
    </View>
  ),
  play: async ({ canvas }) => {
    // At a phone's size twelve Sessions overflow the list, so it can scroll.
    if ('__vitest_browser__' in globalThis) await settleViewport(390);
    const scroll = canvas.getByTestId(sessionsScrollId);

    const heading = await canvas.findByRole('button', {
      name: exampleProjectName,
    });

    await waitFor(async () => {
      await expect(
        heading.getBoundingClientRect().top -
          scroll.getBoundingClientRect().top,
      ).toBeGreaterThanOrEqual(0);
    });
    // Until the rows measure, the list is not yet tall enough to scroll.
    await waitFor(async () => {
      scroll.scrollTop = 40;
      await expect(scroll.scrollTop).toBeGreaterThan(0);
    });
    scroll.scrollTop = scroll.scrollHeight;

    const last = await canvas.findByRole('button', {
      name: 'Large Session 11, Idle',
    });

    await waitFor(async () => {
      scroll.scrollTop = scroll.scrollHeight;
      const viewportBottom = scroll.getBoundingClientRect().bottom;
      await expect(
        viewportBottom - last.getBoundingClientRect().bottom,
      ).toBeGreaterThanOrEqual(0);
      await expect(last.getBoundingClientRect().bottom).toBeGreaterThan(
        scroll.getBoundingClientRect().top,
      );
    });
  },
};
