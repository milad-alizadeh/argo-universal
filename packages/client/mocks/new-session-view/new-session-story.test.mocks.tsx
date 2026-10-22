import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import {
  SessionNewView,
  type SessionNewViewProps,
} from '../../src/screens/sessions/$id/session-new-view';
import { readyNewSession } from '../../src/screens/sessions/$id/session-new-view.mocks';

export const meta = {
  title: 'Tests/Screens/Sessions/New Session',
  parameters: { screenPreview: true },
  args: { view: { state: 'ready', ...readyNewSession } },
  render: ({ view }): React.JSX.Element => <SessionNewView {...view} />,
} satisfies Meta<{ view: SessionNewViewProps }>;

export type Story = StoryObj<typeof meta>;
