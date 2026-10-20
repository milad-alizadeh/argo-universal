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
  type SessionPanels,
  TerminalSignIn,
  type TerminalSignInProps,
} from '#features/sessions';
import { cn } from '#lib/generic/utils';
import type { DroppedFiles } from '#lib/product/file-drop/file-drop-pane';
import { Screen } from '#lib/product/screen/screen';
import { filledClass, useSessionFill } from '#lib/product/session-fill';
import { SessionLayout } from '#lib/product/session-layout';
import { type ErrorToast, useErrorToast } from '#primitives/overlays/toast';
import {
  offeredSessionPanels,
  SessionInspector,
  type SessionInspectorContent,
} from './session-inspector';
import { useSessionSubagents } from './session-subagents';
import { useInspectorPanels } from './use-inspector-panels';

export interface OpenSessionViewProps extends SessionInspectorContent {
  header: SessionHeaderProps;
  feed: FeedProps;
  composer: ComposerProps;
  inspectorPanels?: SessionPanels;
  // Files dropped on the Session's pane attach to the draft.
  onDropFiles: (dropped: DroppedFiles) => void;
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

// The header's triggers open Subagents, Shells and Changes as tabs in the Inspector beside the Session.
function OpenSessionView(props: OpenSessionViewProps): React.JSX.Element {
  const panels = useInspectorPanels(props);

  const subagents = useSubagentPanel(props, panels);

  return (
    <>
      <SessionLayout
        {...sessionParts({ ...props, ...subagents.parts }, panels)}
      />
      <SessionInspector {...props} panels={panels} />
      {subagents.sheet}
    </>
  );
}

const subagentPanel =
  (panels: SessionPanels): ((open: boolean) => void) =>
  (open) =>
    open ? panels.select('subagents') : panels.close('subagents');

const useSubagentPanel = (
  props: OpenSessionViewProps,
  panels: SessionPanels,
): ReturnType<typeof useSessionSubagents> =>
  useSessionSubagents(props, props.subagents, {
    open: panels.state.shown === 'subagents',
    onOpenChange: subagentPanel(panels),
  });

const headerPanels = (
  props: OpenSessionViewProps,
  panels: SessionPanels,
): SessionHeaderProps['panels'] => ({
  offered: offeredSessionPanels(props),
  shown: panels.state.shown,
  changesSummary: props.header.changes?.summary,
  onToggle: (panel) =>
    panel === 'changes' ? panels.toggle(panel) : panels.select(panel),
});

const sessionParts = (
  props: OpenSessionViewProps,
  panels: SessionPanels,
): React.ComponentProps<typeof SessionLayout> => ({
  header: (
    <SessionHeader {...props.header} panels={headerPanels(props, panels)} />
  ),
  feed: <Feed {...props.feed} />,
  composer: sessionBottom(props),
  panel: props.signInTerminal && <TerminalSignIn {...props.signInTerminal} />,
  onDropFiles: hasDraft(props) ? props.onDropFiles : undefined,
});

// A preview or an archived Session has no draft to attach files to.
const hasDraft = (props: OpenSessionViewProps): boolean =>
  !props.preview && !props.archived;

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
  const filled = useSessionFill().filled;

  return (
    // As wide as the Feed: the SessionColumn around it sets the width.
    <View className={cn('w-full items-center', filled && filledClass)}>
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
    writtenPlan: undefined,
    status: composer.status && { ...composer.status, plan: undefined },
  };
}
