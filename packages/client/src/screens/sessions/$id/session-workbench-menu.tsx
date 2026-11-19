import { Action } from '@repo/kit/primitives/actions/action';
import type { ReactElement } from 'react';
import type { SessionPanels } from '#features/sessions';
import { itemsOf, type SessionSection } from './sections/session-section';
import { sessionSections } from './sections/session-sections';
import type {
  OpenSessionViewProps,
  SessionDetailViewProps,
} from './session-detail-view';

export function workbenchMenu(
  props: SessionDetailViewProps,
): ReactElement | undefined {
  if (props.state !== 'open' || !props.inspectorPanels) return undefined;

  return (
    <Action key="workbench" label="Workbench" icon="workbench">
      {sectionActions(props, props.inspectorPanels.select)}
    </Action>
  );
}

function sectionActions(
  props: OpenSessionViewProps,
  select: SessionPanels['select'],
): ReactElement[] {
  return offeredSections(props).map(({ key, title, icon, count }) => (
    <Action
      key={key}
      label={title}
      icon={icon}
      subtitle={count && String(count(props))}
      onPress={() => select(key)}
    />
  ));
}

function offeredSections(content: OpenSessionViewProps): SessionSection[] {
  const items = itemsOf(content);

  return sessionSections(content).filter((section) => section.offered(items));
}
