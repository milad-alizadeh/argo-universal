import type { ReactElement } from 'react';
import {
  type SessionPanel,
  type SessionPanels,
  sessionPanelLabels,
} from '#features/sessions';
import {
  InspectorPage,
  InspectorPages,
  InspectorBody,
  type InspectorProps,
} from '#primitives/scaffolds/inspector';
import {
  panelContent,
  type SessionInspectorContent,
} from './session-inspector-content';

type Props = SessionInspectorContent & {
  panels: SessionPanels;
  inspector: InspectorProps;
  scrollState: InspectorProps['scrollState'];
};

type PageProps = Props & { panel: SessionPanel };

function RetainedPage(props: PageProps): ReactElement {
  return (
    <InspectorPage
      active={props.panels.state.shown === props.panel}
      label={sessionPanelLabels[props.panel].label}
    >
      <PageBody {...props} />
    </InspectorPage>
  );
}

function PageBody(props: PageProps): ReactElement {
  return (
    <InspectorBody
      {...props.inspector}
      {...pageScroll(props)}
      surface="bg-transparent"
      contentScrolls={props.panel !== 'changes'}
    >
      {panelContent[props.panel](props)?.body}
    </InspectorBody>
  );
}

const pageScroll = (props: PageProps): Pick<InspectorProps, 'scrollState'> => ({
  scrollState: props.panel === 'changes' ? props.scrollState : undefined,
});

// Hidden tab pages keep their content tree and native/virtualised scroll views mounted.
export function RetainedInspectorPages(props: Props): ReactElement {
  return (
    <InspectorPages>
      {props.panels.state.tabs.map((panel) => (
        <RetainedPage key={panel} {...props} panel={panel} />
      ))}
    </InspectorPages>
  );
}
