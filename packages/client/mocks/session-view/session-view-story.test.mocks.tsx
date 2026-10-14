import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import {
  type OpenSessionViewProps,
  SessionView,
  type SessionViewProps,
} from '../../src/features/sessions/components/session-view/session-view';
import {
  idleSession,
  runningSession,
} from '../../src/features/sessions/components/session-view/session-view.mocks';

export const feedScrollTestId = 'feed-scroll';

export const meta = {
  title: 'Tests/SessionView',
  parameters: { screenPreview: true },
  args: { view: { state: 'open', ...runningSession } },
  render: ({ view }): React.JSX.Element => <SessionView {...view} />,
} satisfies Meta<{ view: SessionViewProps }>;

export type Story = StoryObj<typeof meta>;

export function openProps(view: SessionViewProps): OpenSessionViewProps {
  if (view.state !== 'open')
    throw new Error('The story needs an open Session.');

  return view;
}

export function idleConfiguration(): NonNullable<
  OpenSessionViewProps['composer']['configuration']
> {
  const { configuration } = idleSession.composer;

  if (!configuration) throw new Error('Idle Session has no configuration.');

  return configuration;
}
