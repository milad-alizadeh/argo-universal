import { ContentHeaderScope } from '@repo/kit/content-header';
import { useWide } from '@repo/kit/use-wide/use-wide';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type * as React from 'react';
import { useState } from 'react';
import { fn } from 'storybook/test';
import { SessionsHeader } from '../../src/features/sessions/components/sessions-header';
import { useSessionsViewState } from '../../src/features/sessions/stores/sessions-view-state';
import { SessionListView } from '../../src/screens/sessions/session-list-view';
import { loadedSessionListView } from '../../src/screens/sessions/session-list-view.mocks';
import { SessionsRootScreen } from '../../src/screens/sessions/sessions-root-screen';

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

type ListViewArgs = React.ComponentProps<typeof SessionListView>;

function ListWithHeader(args: ListViewArgs): React.JSX.Element {
  const wide = useWide();
  const filter = useSessionsViewState();

  if (!wide)
    return (
      <SessionsRootScreen {...filter} onNewSession={args.onNewSession}>
        <SessionListView {...args} />
      </SessionsRootScreen>
    );

  return (
    <ContentHeaderScope>
      <SessionsHeader {...filter} onNewSession={args.onNewSession} />
      <SessionListView {...args} />
    </ContentHeaderScope>
  );
}

export const meta = {
  title: 'Tests/Screens/Sessions',
  component: SessionListView,
  parameters: { screenPreview: true },
  args: { ...loadedSessionListView, ...spies },
  // Wide, New Session sits in the sidebar's header row above the list, and a phone's Sessions Screen has it as its primary Action; the layout choice loads through its own query client.
  render: function WithHeader(args): React.JSX.Element {
    const [client] = useState(() => new QueryClient());

    return (
      <QueryClientProvider client={client}>
        <ListWithHeader {...args} />
      </QueryClientProvider>
    );
  },
  beforeEach: (): void => {
    for (const spy of Object.values(spies)) spy.mockClear();
  },
} satisfies Meta<typeof SessionListView>;

export type Story = StoryObj<typeof meta>;
