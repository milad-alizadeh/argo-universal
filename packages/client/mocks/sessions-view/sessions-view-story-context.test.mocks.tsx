import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { fn } from 'storybook/test';
import { SessionsHeader } from '../../src/features/sessions/components/sessions-header';
import { useSessionsFilter } from '../../src/features/sessions/state/sessions-filter';
import { useWide } from '../../src/lib/generic/use-wide/use-wide';
import { SessionListView } from '../../src/screens/sessions/session-list-view';
import { loadedSessionListView } from '../../src/screens/sessions/session-list-view.mocks';

export const exampleProjectName = 'Example Project';

export const noMatches = 'No matching Sessions';

const spies = {
  onSelect: fn(),
  onNewSession: fn(),
  onNewSessionInProject: fn(),
  onProjectSettings: fn(),
  onLoadMore: fn(),
  onQueryChange: fn(),
};

export const meta = {
  title: 'Tests/SessionListView',
  component: SessionListView,
  parameters: { screenPreview: true },
  args: { ...loadedSessionListView, ...spies },
  // Wide, New Session sits in the sidebar's header row above the list.
  render: function WithHeader(args): React.JSX.Element {
    const wide = useWide();
    const filter = useSessionsFilter();

    return (
      <>
        {wide && (
          <SessionsHeader {...filter} onNewSession={args.onNewSession} />
        )}
        <SessionListView {...args} />
      </>
    );
  },
  beforeEach: (): void => {
    for (const spy of Object.values(spies)) spy.mockClear();
  },
} satisfies Meta<typeof SessionListView>;

export type Story = StoryObj<typeof meta>;
