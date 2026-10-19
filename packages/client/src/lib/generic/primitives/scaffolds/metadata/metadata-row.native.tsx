import type { ReactElement } from 'react';
import { Platform } from 'react-native';
import { ListItem, type ListItemProps } from '#primitives/lists/list-item';
import { spokenField, type MetadataRowProps } from './metadata-props';

// Phones fill ListItem's lanes: iOS trails the value, Android puts it below the label.
function rowProps(props: MetadataRowProps): ListItemProps {
  const row = { title: props.title, accessibilityLabel: spokenField(props) };

  return Platform.OS === 'android'
    ? { ...row, meta: props.children }
    : { ...row, trailing: props.children, labelPlacement: 'beside' };
}

export function MetadataRow(props: MetadataRowProps): ReactElement {
  return <ListItem {...rowProps(props)} />;
}
