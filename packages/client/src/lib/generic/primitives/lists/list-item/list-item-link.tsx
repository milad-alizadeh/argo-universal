import type { ReactElement } from 'react';
import { Platform } from 'react-native';
import { Icon } from '#primitives/content/icon';
import { ListItemFrame } from './list-item';
import type { ListItemProps } from './list-item-props';

function linkContent(props: ListItemProps): ListItemProps {
  if (Platform.OS !== 'android') return props;

  return {
    ...props,
    subtitle: props.value ?? props.subtitle,
    value: undefined,
  };
}

const linkLabel = (props: ListItemProps): string =>
  props.accessibilityLabel ??
  [props.title, props.value].filter(Boolean).join(', ');

export function ListItemLink(props: ListItemProps): ReactElement {
  return (
    <ListItemFrame
      {...linkContent(props)}
      role="link"
      accessibilityLabel={linkLabel(props)}
      accessory={<Icon name="chevron-right" role="row" />}
    />
  );
}
