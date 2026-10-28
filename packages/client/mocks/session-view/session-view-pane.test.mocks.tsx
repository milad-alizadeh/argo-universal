import { settleLayout } from '@repo/kit/mocks/story-layout';
import { Button } from '@repo/kit/primitives/actions/button';
import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { expect, waitFor } from 'storybook/test';
import {
  SessionDetailView,
  type SessionDetailViewProps,
} from '../../src/screens/sessions/$id/session-detail-view';
import { idleSession } from '../../src/screens/sessions/$id/session-detail-view.mocks';
import { feedScrollTestId, type Story } from './session-view-story.test.mocks';

// Collapsed, the pane is a few pixels wide, as while an expanded Inspector takes it over.
const paneWidths = { wide: 1000, collapsed: 5 } as const;

// The Session in a pane whose width the reader changes, as the sidebar and an expanded Inspector change it.
function SessionInPane({
  view,
}: {
  view: SessionDetailViewProps;
}): React.JSX.Element {
  const [width, setWidth] = useState<number>(paneWidths.wide);

  return (
    <View className="h-screen w-full">
      <View className="flex-row">
        <Button
          label="Collapse pane"
          onPress={() => setWidth(paneWidths.collapsed)}
        />
        <Button
          label="Restore pane"
          onPress={() => setWidth(paneWidths.wide)}
        />
      </View>
      <View testID="session-pane" className="flex-1" style={{ width }}>
        <SessionDetailView {...view} />
      </View>
    </View>
  );
}

const rowWidths = (canvas: {
  getAllByTestId: (testId: string) => HTMLElement[];
}): number[] =>
  canvas
    .getAllByTestId('feed-column')
    .map((row) => Math.round(row.getBoundingClientRect().width));

// The Feed's rows reflow to the pane after it collapses and comes back: none stays pinned narrow or spills past the pane.
export const feedReflowsAfterThePaneCollapses: Story = {
  args: { view: { state: 'open', ...idleSession } },
  render: ({ view }): React.JSX.Element => <SessionInPane view={view} />,
  play: async ({ canvas, userEvent }) => {
    await settleLayout('wide');
    await canvas.findByTestId(feedScrollTestId);
    const before = rowWidths(canvas);
    await expect(Math.min(...before)).toBeGreaterThan(0);
    await userEvent.click(
      canvas.getByRole('button', { name: 'Collapse pane' }),
    );
    await waitFor(() =>
      expect(
        canvas.getByTestId(feedScrollTestId).getBoundingClientRect().width,
      ).toBe(paneWidths.collapsed),
    );
    await userEvent.click(canvas.getByRole('button', { name: 'Restore pane' }));
    await waitFor(() => expect(rowWidths(canvas)).toEqual(before));
    const scroll = canvas.getByTestId(feedScrollTestId);
    await expect(scroll.scrollWidth).toBeLessThanOrEqual(scroll.clientWidth);
  },
};
