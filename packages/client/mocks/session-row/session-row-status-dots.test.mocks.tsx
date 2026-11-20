import { eachLayout } from '@repo/kit/mocks/story-layout';
import { sessionRows } from '@repo/mocks/app';
import { Platform } from 'react-native';
import { expect, within } from 'storybook/test';
import { SessionRow } from '../../src/features/sessions/components/session-row/session-row';
import type { SessionsLayout } from '../../src/features/sessions/stores/sessions-view';
import { states, type Story } from './session-row-story.test.mocks';
import { rowWith } from './session-row-whole.test.mocks';

// Which rows end on a status dot, and which show their time, in each layout.
const dotted = (
  layout: SessionsLayout,
): Record<(typeof states)[number][0], boolean> => ({
  needsInput: true,
  running: true,
  failed: true,
  unread: true,
  idle: layout === 'compact' && Platform.OS === 'web',
});

type Canvas = ReturnType<typeof within>;

async function expectRowEnd(
  canvas: Canvas,
  [name, label]: (typeof states)[number],
  layout: SessionsLayout,
): Promise<void> {
  const row = rowWith(
    canvas.getByRole('button', {
      name: `${sessionRows[name].title}, ${label}`,
    }),
  );

  const dot = row.queryByTestId('session-status');
  const time = expect(row.queryByText('12m'));
  const quiet = name !== 'running';

  // A working Session shows no time; its dot already says it is live.
  await (quiet ? time.toBeVisible() : time.not.toBeInTheDocument());
  await (dotted(layout)[name]
    ? expect(dot).toBeVisible()
    : expect(dot).not.toBeInTheDocument());
}

export function statusDots(layout: SessionsLayout): Story {
  return {
    args: { layout, age: '12m' },
    render: (args) => (
      <>
        {states.map(([name]) => (
          <SessionRow {...args} key={name} session={sessionRows[name]} />
        ))}
      </>
    ),
    play: async ({ canvas }) =>
      eachLayout(async () => {
        for (const state of states) await expectRowEnd(canvas, state, layout);
      }),
  };
}
