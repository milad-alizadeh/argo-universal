import type * as React from 'react';
import {
  SessionBandClaim,
  type SessionBarProps,
  type SessionPanels,
} from '#features/sessions';
import { sessionWorkbench } from './sections/session-sections';
import type { OpenSessionViewProps } from './session-detail-view';

export const bandClaim = (
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
