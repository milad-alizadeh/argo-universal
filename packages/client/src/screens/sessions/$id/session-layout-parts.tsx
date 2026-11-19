import type * as React from 'react';
import {
  ArchivedBanner,
  SessionBandClaim,
  SessionBar,
  TerminalSignIn,
  type SessionBarProps,
  type SessionPanels,
} from '#features/sessions';
import type { SessionLayout } from '#lib/product/session-layout';
import { sessionWorkbench } from './sections/session-sections';
import { phoneChangesPill, sessionFeed } from './session-changes-pill';
import { SessionComposer } from './session-composer';
import type { OpenSessionViewProps } from './session-detail-view';
import { voiceStage } from './session-voice-stage';

// The Session bar's lines are Workbench cards where the page has a Workbench, and the layout draws them under a phone's header.
export const sessionParts = (
  props: OpenSessionViewProps,
  panels: SessionPanels,
  wide: boolean,
): React.ComponentProps<typeof SessionLayout> => ({
  header: bandClaim(props, panels),
  bar: sessionBar(props),
  feed: sessionFeed(props, panels, wide),
  stage: voiceStage(props),
  composer: sessionBottom(props, phoneChangesPill(props, panels, wide)),
  panel: props.signInTerminal && <TerminalSignIn {...props.signInTerminal} />,
  onDropFiles: hasDraft(props) ? props.onDropFiles : undefined,
});

const bandClaim = (
  props: OpenSessionViewProps,
  panels: SessionPanels,
): React.JSX.Element => (
  <SessionBandClaim
    {...props.header}
    workbench={sessionWorkbench(props, panels, barForWorkbench(props))}
  />
);

const barForWorkbench = (
  props: OpenSessionViewProps,
): SessionBarProps | undefined => (props.preview ? undefined : props.bar);

const sessionBar = (props: OpenSessionViewProps): React.ReactNode =>
  props.preview || !props.bar ? null : <SessionBar {...props.bar} />;

const hasDraft = (props: OpenSessionViewProps): boolean =>
  !props.preview && !props.archived;

function sessionBottom(
  props: OpenSessionViewProps,
  phonePill: React.ReactNode,
): React.ReactNode {
  if (props.preview) return null;

  if (props.archived) return <ArchivedBanner />;

  return <SessionComposer {...props} phonePill={phonePill} />;
}
