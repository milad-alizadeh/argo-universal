import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import {
  type OpenSessionViewProps,
  SessionDetailView,
  type SessionDetailViewProps,
} from '../../src/screens/sessions/$id/session-detail-view';
import {
  idleSession,
  runningSession,
} from '../../src/screens/sessions/$id/session-detail-view.mocks';
import { sessionScreenHeader } from '../../src/screens/sessions/$id/session-page-header';
import { ScreenHeaderMock } from '../screen-header-mock';

export const feedScrollTestId = 'feed-scroll';

export const meta = {
  title: 'Tests/SessionDetailView',
  parameters: { screenPreview: true },
  args: { view: { state: 'open', ...runningSession } },
  // A narrow window's header, as the screen sets it.
  render: ({ view }): React.JSX.Element => (
    <>
      <ScreenHeaderMock {...sessionScreenHeader(view)} />
      <SessionDetailView {...view} />
    </>
  ),
} satisfies Meta<{ view: SessionDetailViewProps }>;

export type Story = StoryObj<typeof meta>;

export function openProps(view: SessionDetailViewProps): OpenSessionViewProps {
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
