import type { ReactElement } from 'react';
import { Platform } from 'react-native';
import { Icon } from '#primitives/content/icon';
import type { KitProps } from '../../kit-props';
import { ListItemFrame } from './list-item';
import type { ListItemProps } from './list-item-props';

type LinkProps = KitProps<'ListItem.Link'> &
  Pick<
    ListItemProps,
    | 'selected'
    | 'badge'
    | 'testID'
    | 'accessibilityRole'
    | 'role'
    | 'onLongPress'
  >;

const linkLabel = (props: LinkProps): string =>
  props.accessibilityLabel ??
  [props.title, props.value].filter(Boolean).join(', ');

export function ListItemLink(props: LinkProps): ReactElement {
  return (
    <ListItemFrame
      {...props}
      role={linkRole(props)}
      accessibilityLabel={linkLabel(props)}
      accessory={
        Platform.OS === 'android' ? null : (
          <Icon name="chevron-right" role="row" />
        )
      }
    />
  );
}

function linkRole(props: LinkProps): 'button' | 'link' | 'group' {
  if (props.role) return props.role;

  return props.accessibilityRole === 'button' ? 'button' : 'link';
}
