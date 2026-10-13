import { sessionRows } from '@repo/mocks/app';
import type * as React from 'react';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { expect, waitFor } from 'storybook/test';
import { SessionsList } from '../../src/features/sessions/components/sessions-list/sessions-list';
import { largeSessions } from '../../src/features/sessions/components/sessions-list/sessions-list.mocks';
import {
  exampleProjectName,
  type Story,
} from './sessions-list-story-context.test.mocks';

const insertedSession = {
  ...sessionRows.idle,
  sessionId: 'new-session-1',
  title: 'New Session 1',
  activity: 'Session created',
  activityAt: 3000,
};

// A list whose rows change when the story adds a Session, as a live update does.
function InsertingList({
  args,
}: {
  args: React.ComponentProps<typeof SessionsList>;
}): React.JSX.Element {
  const [sessions, setSessions] = useState(largeSessions.slice(0, 12));
  return (
    <View className="flex-1 w-full wide:w-shell-list" style={{ minHeight: 0 }}>
      <Pressable
        role="button"
        onPress={() => setSessions([insertedSession, ...sessions.slice(0, 12)])}
      >
        <Text>Insert Session fixture</Text>
      </Pressable>
      <SessionsList {...args} sessions={sessions} />
    </View>
  );
}

export const insertSessionWithoutOverlap: Story = {
  parameters: { screenPreview: true },
  render: (args) => <InsertingList args={args} />,
  play: async ({ canvas, userEvent }) => {
    const heading = await canvas.findByRole('button', {
      name: exampleProjectName,
    });
    const existing = canvas.getByRole('button', {
      name: 'Large Session 0, Idle',
    });
    await userEvent.hover(heading);
    await waitFor(async () => {
      const firstRow = existing.getBoundingClientRect();
      const project = heading.getBoundingClientRect();
      await expect(Math.abs(firstRow.top - project.bottom)).toBeLessThanOrEqual(
        3,
      );
    });
    const initialTop = existing.getBoundingClientRect().top;
    const positions = [initialTop];
    const movement = new Promise<void>((resolve) => {
      const started = performance.now();
      function sample(): void {
        positions.push(existing.getBoundingClientRect().top);
        if (performance.now() - started < 600) requestAnimationFrame(sample);
        else resolve();
      }
      requestAnimationFrame(sample);
    });
    await userEvent.click(
      canvas.getByRole('button', { name: 'Insert Session fixture' }),
    );
    const inserted = await canvas.findByRole('button', {
      name: 'New Session 1, Idle',
    });
    await waitFor(async () => {
      const newRectangle = inserted.getBoundingClientRect();
      const oldRectangle = existing.getBoundingClientRect();
      await expect(newRectangle.bottom).toBeLessThanOrEqual(
        oldRectangle.top + 1,
      );
    });
    await movement;
    const finalTop = existing.getBoundingClientRect().top;
    await expect(finalTop - initialTop).toBeGreaterThan(0);
    await expect(
      positions.some((top) => top > initialTop + 1 && top < finalTop - 1),
      'Existing rows must pass through intermediate positions, not jump',
    ).toBe(true);
    await userEvent.hover(inserted);
  },
};
