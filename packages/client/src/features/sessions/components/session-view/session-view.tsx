import type * as React from 'react';
import { Composer, type ComposerProps } from '#features/composer';
import { Feed, type FeedProps } from '#features/feed';
import {
  ElicitationSheet,
  type ElicitationFormProps,
} from '#features/requests';
import { useErrorToast } from '#lib/generic/primitives/overlays/toast/toast';
import { Screen } from '#lib/product/screen/screen';
import { SessionLayout } from '#lib/product/session-layout';
import { useWide } from '../../../../lib/generic/use-wide/use-wide';
import {
  serverSilentMessage,
  sessionOpenFailedTitle,
} from '../failure-messages';
import { SessionHeader, type SessionHeaderProps } from '../session-header';

export interface OpenSessionViewProps {
  header: SessionHeaderProps;
  feed: FeedProps;
  composer: ComposerProps;
  elicitation?: ElicitationFormProps;
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
  elicitation,
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

  return (
    <SessionLayout
      header={<SessionHeader {...header} />}
      feed={<Feed {...feed} />}
      composer={
        <>
          <Composer {...composer} configuration={configuration} />
          {elicitation && (
            <ElicitationSheet
              key={elicitation.request.requestId}
              {...elicitation}
            />
          )}
        </>
      }
    />
  );
}
