import { Action } from '@repo/kit/primitives/actions/action';
import type { IconSymbol } from '@repo/kit/symbols/icon-symbol';
import type { ReactElement } from 'react';
import { Platform } from 'react-native';
import type { SessionPanels } from '#features/sessions';
import { itemsOf, offeredFacts } from './sections/session-section';
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
  const sections = offeredFacts(sessionSections(props), itemsOf(props));

  return sections.map(({ key, title, icon, count }) => (
    <Action
      key={key}
      label={title}
      icon={menuIcon(key, icon)}
      subtitle={count && String(count(props))}
      onPress={() => select(key)}
    />
  ));
}

// UIKit's menu needs system SF Symbols for Changes and Agents.
function iosMenuIcon(key: string): IconSymbol | undefined {
  if (key === 'changes') return 'changed-files';

  if (key === 'subagents') return { sf: 'person.2', material: 'smart_toy' };

  return undefined;
}

const menuIcon = (key: string, icon: IconSymbol): IconSymbol =>
  Platform.OS === 'ios' ? (iosMenuIcon(key) ?? icon) : icon;
