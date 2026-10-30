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

function RetainedPage(props: PageProps): ReactElement {
  return (
    <InspectorScreen
      active={props.panels.state.shown === props.section.key}
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

const openSections = (props: Props): SessionSection[] =>
  props.panels.state.tabs.flatMap((key) => sectionOf(props, key) ?? []);

// Hidden tab pages keep their content tree and native/virtualised scroll views mounted.
export function RetainedInspectorPages(props: Props): ReactElement {
  return (
    <InspectorScreens>
      {openSections(props).map((section) => (
        <RetainedPage key={section.key} {...props} section={section} />
      ))}
    </InspectorScreens>
  );
}
