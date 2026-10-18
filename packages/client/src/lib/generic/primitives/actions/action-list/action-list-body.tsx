import type { ReactElement } from 'react';
import { ContextMenu } from '#primitives/overlays/menu';
import type { ActionGroup } from './action-declarations';
import { HeaderActions } from './action-list-header';
import type { ActionListProps } from './action-list-props';

type BodyProps = ActionListProps & { groups: ActionGroup[] };

export function ActionListBody(props: BodyProps): ReactElement | null {
  if (props.variant === 'context') return <ContextActions {...props} />;

  return (
    <HeaderActions
      groups={props.groups}
      label={props.accessibilityLabel ?? 'More actions'}
    />
  );
}

function ContextActions(props: BodyProps): ReactElement | null {
  if (!props.trigger) return null;

  return (
    <ContextMenu
      groups={props.groups.map((group) => group.actions)}
      groupTitles={props.groups.map((group) => group.title)}
      title={props.title}
      preview={props.preview}
      onDoubleClick={props.onDoubleClick}
    >
      {props.trigger}
    </ContextMenu>
  );
}
