import type * as React from 'react';
import { createRoot } from 'react-dom/client';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { expect, waitFor } from 'storybook/test';
import { SessionsList } from '../../src/features/sessions/components/sessions-list/sessions-list';
import { renderingSessions } from '../../src/features/sessions/components/sessions-list/sessions-rendering.mocks';
import type { Story } from './sessions-list-story-context.test.mocks';

const unchangedSessionLabel = 'Unchanged Session, Idle';
const selectableSessionId = 'memo-selectable';

export const memoizedRows: Story = {
  render: () => <View testID="controlled-list" />,
  play: async ({ canvas, userEvent, args }) => {
    const root = createRoot(canvas.getByTestId('controlled-list'));
    const render = (props: React.ComponentProps<typeof SessionsList>): void =>
      root.render(
        <SafeAreaProvider>
          <View style={{ height: 360 }}>
            <SessionsList {...props} />
          </View>
        </SafeAreaProvider>,
      );
    const props = { ...args, sessions: renderingSessions };
    try {
      render(props);
      const unchanged = await canvas.findByRole('button', {
        name: unchangedSessionLabel,
      });
      const selectable = canvas.getByRole('button', {
        name: 'Selectable Session, Idle',
      });
      await userEvent.click(selectable);
      await expect(args.onSelect).toHaveBeenCalledWith(selectableSessionId);
      render({ ...props, selectedSessionId: selectableSessionId });
      await waitFor(() =>
        expect(selectable).toHaveAttribute('aria-pressed', 'true'),
      );
      await expect(
        canvas.getByRole('button', { name: unchangedSessionLabel }),
      ).toBe(unchanged);
      render({
        ...props,
        selectedSessionId: selectableSessionId,
        sessions: renderingSessions.map((session) =>
          session.sessionId === 'memo-updated'
            ? { ...session, activity: 'Session activity updated' }
            : session,
        ),
      });
      await canvas.findByText('Session activity updated');
      await expect(
        canvas.getByRole('button', { name: unchangedSessionLabel }),
      ).toBe(unchanged);
    } finally {
      root.unmount();
    }
  },
};
