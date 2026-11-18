import {
  InspectorScreen,
  InspectorScreens,
  InspectorBody,
  type InspectorProps,
} from '@repo/kit/primitives/scaffolds/inspector';
import type { ReactElement } from 'react';
import type { SessionPanels } from '#features/sessions';
import type { SessionSection } from './sections/session-section';
import { sectionOf, sectionTab } from './sections/session-sections';
import type { SessionInspectorContent } from './session-inspector-content';

type Props = SessionInspectorContent & {
  panels: SessionPanels;
  inspector: InspectorProps;
};

type PageProps = Props & { section: SessionSection };

const retainedTabs = (
  state: SessionPanels['state'],
): Pick<SessionPanels['state'], 'tabs' | 'shown'> => state.hidden ?? state;

function RetainedPage(props: PageProps): ReactElement {
  return (
    <InspectorScreen
      active={retainedTabs(props.panels.state).shown === props.section.key}
      label={props.section.title}
    >
      <PageBody {...props} />
    </InspectorScreen>
  );
}

function PageBody({ section, ...props }: PageProps): ReactElement {
  return (
    <InspectorBody {...props.inspector} surface="bg-transparent" contentScrolls>
      {section.tab(props, sectionTab(props.panels, section.key)).body}
    </InspectorBody>
  );
}

const retainedSections = (props: Props): SessionSection[] =>
  retainedTabs(props.panels.state).tabs.flatMap(
    (key) => sectionOf(props, key) ?? [],
  );

// Keep tab pages mounted across tab switches and while the Inspector is hidden.
export function RetainedInspectorPages(props: Props): ReactElement {
  return (
    <InspectorScreens>
      {retainedSections(props).map((section) => (
        <RetainedPage key={section.key} {...props} section={section} />
      ))}
    </InspectorScreens>
  );
}
