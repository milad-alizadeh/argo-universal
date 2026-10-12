import type * as React from 'react';
import { Composer, type ComposerProps } from '#features/composer';
import { Feed, type FeedProps } from '#features/feed';
import { useErrorToast } from '#lib/generic/primitives/overlays/toast/toast';
import { PageHeader } from '#lib/product/page-header';
import { Screen } from '#lib/product/screen/screen';
import { SessionLayout } from '#lib/product/session-layout';
import { useWide } from '../../../../lib/generic/use-wide/use-wide';
import type { StartingFeed } from '../../state/starting-feed';
import {
  serverSilentMessage,
  sessionOpenFailedTitle,
} from '../failure-messages';
import { SessionHeader, type SessionHeaderProps } from '../session-header';
import { StartingSessionFeed } from '../starting-session-feed';

export interface OpenSessionViewProps {
  header: SessionHeaderProps;
  feed: FeedProps;
  composer: ComposerProps;
}

export type SessionViewProps =
  // Opened from New Session, it shows the sent first prompt until its Feed loads.
  | { state: 'opening'; starting?: StartingFeed }
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
  if (props.state === 'opening' && props.starting)
    return <StartingSessionView starting={props.starting} />;
  return <Screen edges={['bottom']} />;
}

const emptyDraft = { text: '', images: [] };
const waitForSession = (): void => {};

// The page New Session left, held until the Session's own header, Feed and Composer load.
function StartingSessionView({
  starting,
}: {
  starting: StartingFeed;
}): React.JSX.Element {
  return (
    <SessionLayout
      header={<PageHeader title={null} />}
      feed={<StartingSessionFeed starting={starting} />}
      composer={
        <Composer
          draft={emptyDraft}
          onDraftChange={waitForSession}
          onAttachImages={waitForSession}
          onSend={waitForSession}
          disabled
        />
      }
    />
  );
}

function OpenSessionView({
  header,
  feed,
  composer,
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
      composer={<Composer {...composer} configuration={configuration} />}
    />
  );
}
