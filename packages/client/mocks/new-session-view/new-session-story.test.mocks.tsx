import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import {
  NewSessionView,
  type NewSessionViewProps,
} from '../../src/screens/sessions/$id/new-session-view';
import { readyNewSession } from '../../src/screens/sessions/$id/new-session-view.mocks';

export const meta = {
  title: 'Tests/NewSessionView',
  parameters: { screenPreview: true },
  args: { view: { state: 'ready', ...readyNewSession } },
  render: ({ view }): React.JSX.Element => <NewSessionView {...view} />,
} satisfies Meta<{ view: NewSessionViewProps }>;

export type Story = StoryObj<typeof meta>;
