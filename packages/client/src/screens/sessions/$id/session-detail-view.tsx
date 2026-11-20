import {
  type ErrorToast,
  useErrorToast,
} from '@repo/kit/primitives/overlays/toast';
import type * as React from 'react';
import type { ComposerProps } from '#features/composer';
import type { FeedProps } from '#features/feed';
import type { ElicitationFormProps } from '#features/requests';
import {
  serverSilentMessage,
  type SessionBarProps,
  type SessionCalloutProps,
  type StoppedTurnCalloutProps,
  sessionOpenFailedTitle,
  type SessionHeaderProps,
  type SessionPanels,
  type TerminalSignInProps,
} from '#features/sessions';
import { useContentWide } from '#lib/product/content-layout';
import type { DroppedFiles } from '#lib/product/file-drop/file-drop-pane';
import { SessionLayout } from '#lib/product/session-layout';
import { BlankSession } from './blank-session';
import {
  SessionInspector,
  type SessionInspectorContent,
} from './session-inspector';
import { sessionParts } from './session-layout-parts';
import { useWorkPanels } from './session-work-panels';
import { useInspectorPanels } from './use-inspector-panels';
import { usePhoneSheet } from './use-phone-sheet';
import { useSessionWorkbench } from './use-session-workbench';

export interface OpenSessionViewProps extends SessionInspectorContent {
  header: SessionHeaderProps;
  bar?: SessionBarProps;
  feed: FeedProps;
  composer: ComposerProps;
  inspectorPanels?: SessionPanels;
  onOpenWorkbench?: () => void;
  // Files dropped on the Session's pane attach to the draft.
  onDropFiles: (dropped: DroppedFiles) => void;
  elicitation?: ElicitationFormProps;
  // Sign-in or launch trouble, drawn above the Composer.
  callout?: SessionCalloutProps;
  // The Feed's last Turn ended in an error, drawn above the Composer with its Retry.
  stoppedTurn?: StoppedTurnCalloutProps;
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

type DrawHeader = (props: SessionDetailViewProps) => React.ReactNode;

const noHeader: DrawHeader = () => null;

export function SessionDetailView({
  drawHeader = noHeader,
  ...props
}: SessionDetailViewProps & { drawHeader?: DrawHeader }): React.JSX.Element {
  useErrorToast(failureToast(props));

  if (props.state === 'open')
    return <OpenSessionView {...props} drawHeader={drawHeader} />;

  return (
    <>
      {drawHeader(props)}
      <BlankSession {...props} />
    </>
  );
}

type HeadedSession = OpenSessionViewProps & { drawHeader: DrawHeader };

type PhoneSheet = ReturnType<typeof usePhoneSheet>;

// The header and the Session body share the phone sheet's presentation state.
function OpenSessionView(session: HeadedSession): React.JSX.Element {
  const { drawHeader, ...props } = session;
  const phone = usePhoneSheet(useInspectorPanels(props));

  const workbench = useSessionWorkbench(props);

  return (
    <>
      {drawHeader(openHeader(props, phone.panels, workbench.open))}
      <OpenSessionBody {...props} phone={phone} />
      {workbench.sheet}
    </>
  );
}

const openHeader = (
  props: OpenSessionViewProps,
  inspectorPanels: SessionPanels,
  onOpenWorkbench: () => void,
): SessionDetailViewProps => ({
  ...props,
  state: 'open',
  inspectorPanels,
  onOpenWorkbench,
});

type SessionBodyProps = OpenSessionViewProps & { phone: PhoneSheet };

function OpenSessionBody({
  phone,
  ...props
}: SessionBodyProps): React.JSX.Element {
  const wide = useContentWide();
  const work = useWorkPanels(props, phone.panels, phone.visible);
  const layout = sessionParts(withWork(props, work), phone.panels, wide);

  return (
    <>
      <SessionLayout {...layout} />
      {sessionInspector(props, work, phone)}
      {work.sheets}
    </>
  );
}

const sessionInspector = (
  props: OpenSessionViewProps,
  work: ReturnType<typeof useWorkPanels>,
  phone: ReturnType<typeof usePhoneSheet>,
): React.JSX.Element => (
  <SessionInspector
    {...withOpenSubagent(props, work)}
    panels={phone.panels}
    phoneVisible={phone.visible}
  />
);

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

// The Feed's Agent rows open the same Agent sheet or Inspector tab as Workbench.
const withWork = (
  props: OpenSessionViewProps,
  work: ReturnType<typeof useWorkPanels>,
): OpenSessionViewProps => ({
  ...props,
  feed: work.feed,
  subagents: work.subagents,
});
