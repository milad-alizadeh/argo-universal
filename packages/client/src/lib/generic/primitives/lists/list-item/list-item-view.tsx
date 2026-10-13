import type * as React from 'react';
import { useContext } from 'react';
import { Pressable, View } from 'react-native';
import {
  FieldRowCorners,
  FieldRowEnd,
  useNavigationFields,
} from '../../fields/field-layout';
import { type ListItemProps, listItemName } from '../../fields/field-props';
import { ListItemBody } from './list-item-content';
import { type RowPlace, rowClasses } from './list-item-styles';
import {
  interactionProps,
  linkProps,
  selectionProps,
} from './list-item-web-props';

export function ListItem(props: ListItemProps): React.JSX.Element {
  const rowProps = useRowProps(props);
  const content = <ListItemBody {...props} />;
  if (!props.onPress)
    return (
      <View {...rowProps} role="group">
        {content}
      </View>
    );
  return (
    <PressableRow {...rowProps} item={props} press={props.onPress}>
      {content}
    </PressableRow>
  );
}

function useRowPlace(): RowPlace {
  return {
    endsSection: useContext(FieldRowEnd),
    corners: useContext(FieldRowCorners),
  };
}

function useRowProps(props: ListItemProps): ReturnType<
  typeof selectionProps
> & {
  accessibilityLabel: string;
  className: string;
} {
  const navigation = useNavigationFields();
  return {
    accessibilityLabel: listItemName(props),
    ...selectionProps(props),
    className: rowClasses(props, navigation, useRowPlace()),
  };
}

interface PressableRowProps extends React.ComponentProps<typeof View> {
  item: ListItemProps;
  press: () => void;
}

function PressableRow(props: PressableRowProps): React.JSX.Element {
  const { item, press, children, ...rowProps } = props;
  return (
    <Pressable
      {...linkProps(item)}
      {...rowProps}
      {...interactionProps(item, press)}
    >
      {children}
    </Pressable>
  );
}
