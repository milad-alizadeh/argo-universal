import type * as React from 'react';
import { useContext } from 'react';
import { Pressable, View } from 'react-native';
import {
  FieldRowCorners,
  FieldRowEnd,
  FieldRowHover,
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
  const item = useHoverLink(props);
  if (!props.onPress)
    return (
      <View {...rowProps} role="group">
        <ListItemBody {...props} />
      </View>
    );
  return (
    <PressableRow {...rowProps} item={item} press={props.onPress}>
      <ListItemBody {...props} />
    </PressableRow>
  );
}

function useRowPlace(): RowPlace {
  return {
    endsSection: useContext(FieldRowEnd),
    corners: useContext(FieldRowCorners),
    separatorHidden: useContext(FieldRowHover)?.separatorHidden,
  };
}

// A list's neighbours learn of this row's hover, beside the caller's own handlers.
function useHoverLink(props: ListItemProps): ListItemProps {
  const hover = useContext(FieldRowHover);
  if (!hover) return props;
  return {
    ...props,
    onHoverIn: (event) => {
      hover.onHover(true);
      props.onHoverIn?.(event);
    },
    onHoverOut: (event) => {
      hover.onHover(false);
      props.onHoverOut?.(event);
    },
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
