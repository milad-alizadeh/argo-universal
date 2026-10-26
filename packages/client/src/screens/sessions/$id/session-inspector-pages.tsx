import {
  InspectorScreen,
  InspectorScreens,
  InspectorBody,
  type InspectorProps,
} from '@repo/kit/primitives/scaffolds/inspector';
import type { ReactElement } from 'react';
import {
  type SessionPanel,
  type SessionPanels,
  sessionPanelLabels,
} from '#features/sessions';
import {
  panelContent,
  type SessionInspectorContent,
} from './session-inspector-content';

type Props = SessionInspectorContent & {
  panels: SessionPanels;
  inspector: InspectorProps;
};

type PageProps = Props & { panel: SessionPanel };

function RetainedPage(props: PageProps): ReactElement {
  return (
    <InspectorScreen
      active={props.panels.state.shown === props.panel}
      label={sessionPanelLabels[props.panel].label}
    >
      <PageBody {...props} />
    </InspectorScreen>
  );
}

function PageBody(props: PageProps): ReactElement {
  return (
    <InspectorBody {...props.inspector} surface="bg-transparent" contentScrolls>
      {panelContent[props.panel](props)?.body}
    </InspectorBody>
  );
}

// Hidden tab pages keep their content tree and native/virtualised scroll views mounted.
export function RetainedInspectorPages(props: Props): ReactElement {
  return (
    <InspectorScreens>
      {props.panels.state.tabs.map((panel) => (
        <RetainedPage key={panel} {...props} panel={panel} />
      ))}
    </InspectorScreens>
  );
}
