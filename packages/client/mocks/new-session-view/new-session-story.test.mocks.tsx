import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import {
  NewSessionView,
  type NewSessionViewProps,
} from '../../src/features/sessions/components/new-session-view/new-session-view';
import { readyNewSession } from '../../src/features/sessions/components/new-session-view/new-session-view.mocks';

export const meta = {
  title: 'Tests/NewSessionView',
  parameters: { screenPreview: true },
  args: { view: { state: 'ready', ...readyNewSession } },
  render: ({ view }): React.JSX.Element => <NewSessionView {...view} />,
} satisfies Meta<{ view: NewSessionViewProps }>;
export default meta;
export type Story = StoryObj<typeof meta>;
