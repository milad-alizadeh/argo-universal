import type * as React from 'react';
import { Composer, type ComposerProps } from '#features/composer';
import { Feed, type FeedProps } from '#features/feed';
import { Screen } from '#lib/product/screen';
import { SessionLayout } from '#lib/product/session-layout';
import { useErrorToast } from '#primitives/toast';
import { useWide } from '../../../lib/generic/use-wide';
import { SessionHeader, type SessionHeaderProps } from './session-header';

export interface OpenSessionViewProps {
  header: SessionHeaderProps;
  feed: FeedProps;
  composer: ComposerProps;
}

export type SessionViewProps =
  | { state: 'opening' }
  // The Session couldn't load or open; the reason is the Server's, when it gave one.
  | { state: 'failed'; reason?: string }
  | ({ state: 'open' } & OpenSessionViewProps);

const serverSilent = "The Server didn't respond. Check that it's running.";

// One Session: its header, its Feed, and the Composer pinned below.
export function SessionView(props: SessionViewProps): React.JSX.Element {
  // A failed Session stays on its blank opening page: the toast says why, and the Session retries when the Connection reopens or the window regains focus.
  useErrorToast(
    props.state === 'failed'
      ? {
          title: "Couldn't open the Session",
          message: props.reason ?? serverSilent,
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
