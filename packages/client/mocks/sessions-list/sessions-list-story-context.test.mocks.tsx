import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { fn } from 'storybook/test';
import { SessionsList } from '../../src/features/sessions/components/sessions-list/sessions-list';
import { sessionsListProps } from '../../src/features/sessions/components/sessions-list/sessions-list.mocks';

export const exampleProjectName = 'Example Project';

// A Project heading's Actions, as ProjectHeading declares them; a wide heading's buttons also speak the Project.
export const newSessionLabel = 'New Session';

export const projectSettingsLabel = 'Project settings';

export const projectButtonName = (label: string): string =>
  `${label}, ${exampleProjectName}`;

export const sessionsScrollId = 'sessions-scroll';

export const onNewSession = fn();

export const onProjectSettings = fn();

export const meta = {
  title: 'Tests/Sessions/SessionsList',
  component: SessionsList,
  args: {
    ...sessionsListProps,
    onSelect: fn(),
    onEndReached: fn(),
    onNewSession,
    onProjectSettings,
  },
  render: (args): React.JSX.Element => (
    <View className="w-full wide:w-frame-list" style={{ height: 320 }}>
      <SessionsList {...args} />
    </View>
  ),
  beforeEach: (): void => {
    onNewSession.mockClear();
    onProjectSettings.mockClear();
  },
} satisfies Meta<typeof SessionsList>;

export type Story = StoryObj<typeof meta>;
