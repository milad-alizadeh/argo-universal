import type { ReactElement, ReactNode } from 'react';
import { Platform, View } from 'react-native';
import { ListItem, type ListItemProps } from '#primitives/lists/list-item';
import type { MetadataLabelProps } from './metadata-props';

function labelPlacement(): ListItemProps['labelPlacement'] {
  if (Platform.OS === 'web') return 'above';

  return Platform.OS === 'ios' ? 'beside' : undefined;
}

function valuePlacement(
  value: ReactNode,
): Pick<ListItemProps, 'trailing' | 'meta'> {
  return Platform.OS === 'android' ? { meta: value } : { trailing: value };
}

type RowProps = Pick<MetadataLabelProps, 'title' | 'accessibilityLabel'> & {
  label: string;
  children: ReactNode;
};

function rowProps(props: RowProps): ListItemProps {
  return {
    title: props.title,
    labelPlacement: labelPlacement(),
    accessibilityLabel:
      props.accessibilityLabel ?? `${props.title}, ${props.label}`,
    ...valuePlacement(props.children),
  };
}

export function MetadataRow(props: RowProps): ReactElement {
  return (
    <View className={Platform.OS === 'web' ? 'mb-4' : undefined}>
      <ListItem {...rowProps(props)} />
    </View>
  );
}
