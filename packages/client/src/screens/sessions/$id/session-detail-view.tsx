import {
  type ErrorToast,
  useErrorToast,
} from '@repo/kit/primitives/overlays/toast';
import { cn } from '@repo/kit/utils';
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
  SessionBandClaim,
  SessionBar,
  type SessionBarProps,
  SessionCallout,
  type SessionCalloutProps,
  sessionOpenFailedTitle,
  type SessionHeaderProps,
  type SessionPanels,
  TerminalSignIn,
  type TerminalSignInProps,
} from '#features/sessions';
import type { DroppedFiles } from '#lib/product/file-drop/file-drop-pane';
import { filledClass, useSessionFill } from '#lib/product/session-fill';
import { SessionLayout } from '#lib/product/session-layout';
import { BlankSession } from './blank-session';
import { composerUnderQuestion } from './composer-under-question';
import { sessionWorkbench } from './sections/session-sections';
import {
  SessionInspector,
  type SessionInspectorContent,
} from './session-inspector';
import { useWorkPanels } from './session-work-panels';
import { useInspectorPanels } from './use-inspector-panels';

export interface OpenSessionViewProps extends SessionInspectorContent {
  header: SessionHeaderProps;
  bar?: SessionBarProps;
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
  // The Server has no Session with the id: the page says so and leads back to the Sessions list.
  | { state: 'missing'; onLeave: () => void }
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

  return <BlankSession {...props} />;
}

// The Workbench's cards open the Session's Sections as tabs in the Inspector beside it.
function OpenSessionView(props: OpenSessionViewProps): React.JSX.Element {
  const panels = useInspectorPanels(props);
  const work = useWorkPanels(props, panels);

  return (
    <>
      <SessionLayout {...sessionParts(withWork(props, work), panels)} />
      <SessionInspector {...withOpenSubagent(props, work)} panels={panels} />
      {work.sheets}
    </>
  );
}

// The Inspector's Agents tab lists the same Subagents, and opens the one the Session has open.
const withOpenSubagent = (
  props: OpenSessionViewProps,
  work: ReturnType<typeof useWorkPanels>,
): OpenSessionViewProps &
  Pick<SessionInspectorContent, 'openSubagentFeed'> => ({
  ...props,
  subagents: work.subagents,
  openSubagentFeed: work.openSubagentFeed,
});

// The Composer carries the work pills, and the Feed's Subagent rows open the Subagents panel.
const withWork = (
  props: OpenSessionViewProps,
  work: ReturnType<typeof useWorkPanels>,
): OpenSessionViewProps => ({
  ...props,
  composer: work.composer,
  feed: work.feed,
});

const sessionParts = (
  props: OpenSessionViewProps,
  panels: SessionPanels,
): React.ComponentProps<typeof SessionLayout> => ({
  header: bandClaim(props, panels),
  bar: sessionBar(props),
  feed: <Feed {...props.feed} />,
  composer: sessionBottom(props),
  panel: props.signInTerminal && <TerminalSignIn {...props.signInTerminal} />,
  onDropFiles: hasDraft(props) ? props.onDropFiles : undefined,
});

const bandClaim = (
  props: OpenSessionViewProps,
  panels: SessionPanels,
): React.JSX.Element => (
  <SessionBandClaim
    {...props.header}
    workbench={sessionWorkbench(props, panels)}
  />
);

// The Plugins' line under the header; a preview is the Feed alone.
const sessionBar = (props: OpenSessionViewProps): React.ReactNode =>
  props.preview || !props.bar ? null : <SessionBar {...props.bar} />;

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
