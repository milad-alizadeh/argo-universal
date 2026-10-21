import type { ReactElement } from 'react';
import { ContextMenu } from '#primitives/overlays/menu';
import { pressGroups, type ActionGroup } from './action-declarations';
import { HeaderActions } from './action-list-header';
import type { ActionListProps } from './action-list-props';
import { headerSlots } from './header-actions';

type BodyProps = ActionListProps & { groups: ActionGroup[] };

export function ActionListBody(props: BodyProps): ReactElement | null {
  if (props.variant === 'context') return <ContextBody {...props} />;

  return (
    <HeaderActions
      groups={props.groups}
      label={props.accessibilityLabel ?? 'More actions'}
      slots={headerSlots}
    />
  );
}

function ContextBody(props: BodyProps): ReactElement | null {
  if (!props.trigger) return null;
  // A context menu is one level on every platform, so it lists press Actions only and leaves submenus out.
  const groups = pressGroups(props.groups);

  return (
    <ContextMenu
      groups={groups.map((group) => group.actions)}
      groupTitles={groups.map((group) => group.title)}
      title={props.title}
      preview={props.preview}
      onDoubleClick={props.onDoubleClick}
    >
      {props.trigger}
    </ContextMenu>
  );
}
