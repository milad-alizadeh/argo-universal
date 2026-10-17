import type * as React from 'react';
import { View } from 'react-native';
import { Composer, type ComposerProps } from '#features/composer';
import { Feed, type FeedProps } from '#features/feed';
import {
  ElicitationSheet,
  type ElicitationFormProps,
} from '#features/requests';
import {
  ArchivedBanner,
  serverSilentMessage,
  SessionCallout,
  type SessionCalloutProps,
  sessionOpenFailedTitle,
  SessionHeader,
  type SessionHeaderProps,
  TerminalSignIn,
  type TerminalSignInProps,
} from '#features/sessions';
import { Screen } from '#lib/product/screen/screen';
import { SessionLayout } from '#lib/product/session-layout';
import { type ErrorToast, useErrorToast } from '#primitives/overlays/toast';

export interface OpenSessionViewProps {
  header: SessionHeaderProps;
  feed: FeedProps;
  composer: ComposerProps;
  elicitation?: ElicitationFormProps;
  // Sign-in or launch trouble, drawn above the Composer.
  callout?: SessionCalloutProps;
  // A terminal sign-in method's panel or sheet.
  signInTerminal?: TerminalSignInProps;
  // Drawn as iOS's long-press preview above a Session's menu: the Feed alone, with nothing to type into.
  preview?: boolean;
  // An archived Session reads only: a banner takes the Composer's place.
  archived?: boolean;
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
      composer={sessionBottom(props)}
      panel={
        props.signInTerminal && <TerminalSignIn {...props.signInTerminal} />
      }
    />
  );
}

// The bottom slot: nothing in a preview, the banner for an archived Session, else the Composer.
function sessionBottom(props: OpenSessionViewProps): React.ReactNode {
  if (props.preview) return null;

  if (props.archived) return <ArchivedBanner />;

  return <SessionComposer {...props} />;
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
  return (
    // As wide as the Feed: the SessionColumn around it sets the width.
    <View className="w-full items-center">
      <QuestionSheet elicitation={props.elicitation} />
      <Composer
        {...composerUnderQuestion(props.composer, props.elicitation)}
        callout={props.callout && <SessionCallout {...props.callout} />}
      />
    </View>
  );
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
