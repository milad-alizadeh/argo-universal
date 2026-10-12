import type * as React from 'react';
import { Composer, type ComposerProps } from '#features/composer';
import { Feed, type FeedProps } from '#features/feed';
import { Screen } from '#lib/product/screen';
import { SessionLayout } from '#lib/product/session-layout';
import { useErrorToast } from '#primitives/toast';
import { Button } from '../../../lib/generic/primitives/button';
import { useWide } from '../../../lib/generic/use-wide';
import {
  serverSilentMessage,
  sessionOpenFailedTitle,
} from './failure-messages';
import { SessionHeader, type SessionHeaderProps } from './session-header';

export interface OpenSessionViewProps {
  header: SessionHeaderProps;
  feed: FeedProps;
  composer: ComposerProps;
  // Closes a Session that has no Turn yet; shown while its Feed is empty and no Turn runs.
  cancelCreation: { disabled: boolean; onCancel: () => void };
}

export type SessionViewProps =
  | { state: 'opening' }
  // The Session couldn't load or open; the reason is the Server's, when it gave one.
  | { state: 'failed'; reason?: string }
  | ({ state: 'open' } & OpenSessionViewProps);

// One Session: its header, its Feed, and the Composer pinned below.
export function SessionView(props: SessionViewProps): React.JSX.Element {
  // A failed Session stays on its blank opening page: the toast says why, and the Session retries when the Connection reopens.
  useErrorToast(
    props.state === 'failed'
      ? {
          title: sessionOpenFailedTitle,
          message: props.reason ?? serverSilentMessage,
        }
      : undefined,
  );
  if (props.state === 'open') return <OpenSessionView {...props} />;
  return <Screen edges={['bottom']} />;
}

function OpenSessionView({
  header,
  feed,
  composer,
  cancelCreation,
}: OpenSessionViewProps): React.JSX.Element {
  const wide = useWide();
  const configuration = composer.configuration && {
    ...composer.configuration,
    // A phone draws no checkout row above the Composer.
    checkout: {
      ...composer.configuration.checkout,
      path: wide ? composer.configuration.checkout.path : undefined,
    },
  };
  const creating =
    !composer.configuration?.turnRunning && feed.items.length === 0;

  return (
    <SessionLayout
      header={<SessionHeader {...header} />}
      feed={<Feed {...feed} />}
      composer={
        <>
          {creating && (
            <Button
              variant="ghost"
              accessibilityLabel="Cancel creation"
              disabled={cancelCreation.disabled}
              onPress={cancelCreation.onCancel}
              label={'Cancel creation'}
            />
          )}
          <Composer {...composer} configuration={configuration} />
        </>
      }
    />
  );
}
