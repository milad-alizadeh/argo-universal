import type * as React from 'react';
import { View } from 'react-native';
import { Composer, type ComposerProps } from '#features/composer';
import { Feed, type FeedProps } from '#features/feed';
import {
  ElicitationSheet,
  type ElicitationFormProps,
} from '#features/requests';
import {
  serverSilentMessage,
  sessionOpenFailedTitle,
  SessionHeader,
  type SessionHeaderProps,
} from '#features/sessions';
import { useWide } from '#lib/generic/use-wide/use-wide';
import { Screen } from '#lib/product/screen/screen';
import { SessionLayout } from '#lib/product/session-layout';
import { type ErrorToast, useErrorToast } from '#primitives/overlays/toast';

export interface OpenSessionViewProps {
  header: SessionHeaderProps;
  feed: FeedProps;
  composer: ComposerProps;
  elicitation?: ElicitationFormProps;
}

export type SessionDetailViewProps =
  | { state: 'opening' }
  // The Session couldn't load or open; the reason is the Server's, when it gave one.
  | { state: 'failed'; reason?: string }
  | ({ state: 'open' } & OpenSessionViewProps);

// A failed Session stays on its blank opening page: the toast says why, and the Session retries when the Connection reopens.
function failureToast(props: SessionDetailViewProps): ErrorToast | undefined {
  if (props.state !== 'failed') return undefined;

  return {
    title: sessionOpenFailedTitle,
    message: props.reason ?? serverSilentMessage,
  };
}

// What a narrow window's header names the page: the open Session's title; until it opens, the page is a Session.
export const sessionPageTitle = (props: SessionDetailViewProps): string =>
  props.state === 'open' ? props.header.title : 'Session';

// One Session: its header, its Feed, and the Composer pinned below.
export function SessionDetailView(
  props: SessionDetailViewProps,
): React.JSX.Element {
  useErrorToast(failureToast(props));

  if (props.state === 'open') return <OpenSessionView {...props} />;

  return <Screen edges={['bottom']}>{null}</Screen>;
}

function OpenSessionView(props: OpenSessionViewProps): React.JSX.Element {
  return (
    <SessionLayout
      header={<SessionHeader {...props.header} />}
      feed={<Feed {...props.feed} />}
      composer={<SessionComposer {...props} />}
    />
  );
}

function QuestionSheet({
  elicitation,
}: Pick<OpenSessionViewProps, 'elicitation'>): React.ReactNode {
  if (!elicitation) return null;

  return (
    <ElicitationSheet key={elicitation.request.requestId} {...elicitation} />
  );
}

function SessionComposer(props: OpenSessionViewProps): React.JSX.Element {
  const wide = useWide();

  return (
    // As wide as the Feed: the SessionColumn around it sets the width.
    <View className="w-full items-center">
      <QuestionSheet elicitation={props.elicitation} />
      <Composer
        {...composerUnderQuestion(props.composer, props.elicitation)}
        configuration={composerConfiguration(props.composer, wide)}
      />
    </View>
  );
}

function composerConfiguration(
  composer: ComposerProps,
  wide: boolean,
): ComposerProps['configuration'] {
  const { configuration } = composer;

  if (!configuration) return configuration;

  return {
    ...configuration,
    // A phone draws no checkout row above the Composer.
    checkout: {
      ...configuration.checkout,
      path: wide ? configuration.checkout.path : undefined,
    },
  };
}

function composerUnderQuestion(
  composer: ComposerProps,
  question?: ElicitationFormProps,
): ComposerProps {
  if (!question) return composer;

  return {
    ...composer,
    planProposal: undefined,
    writtenPlan: undefined,
    status: composer.status && { ...composer.status, plan: undefined },
  };
}
