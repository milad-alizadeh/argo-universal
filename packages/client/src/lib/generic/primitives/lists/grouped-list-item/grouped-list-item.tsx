import type * as React from 'react';
import { type JSX, useContext } from 'react';
import { Pressable, View } from 'react-native';
import {
  useOverlayList,
  useSidebarList,
} from '#primitives/fields/field-layout';
import { GroupedListItemBody } from './grouped-list-item-content';
import {
  GroupedListItemCorners,
  GroupedListItemEnd,
  GroupedListItemHover,
} from './grouped-list-item-position';
import {
  type GroupedListItemProps,
  groupedListItemName,
} from './grouped-list-item-props';
import { type RowPlace, rowClasses } from './grouped-list-item-styles';
import {
  interactionProps,
  linkProps,
  selectionProps,
} from './grouped-list-item-web-props';

export function GroupedListItem(props: GroupedListItemProps): JSX.Element {
  const rowProps = useRowProps(props);
  const item = useHoverLink(props);

  if (!props.onPress)
    return (
      <View {...rowProps} role="group">
        <GroupedListItemBody {...props} />
      </View>
    );

  return (
    <PressableRow {...rowProps} item={item} press={props.onPress}>
      <GroupedListItemBody {...props} />
    </PressableRow>
  );
}

function useRowPlace(): RowPlace {
  return {
    overlay: useOverlayList(),
    endsSection: useContext(GroupedListItemEnd),
    corners: useContext(GroupedListItemCorners),
    separatorHidden: useContext(GroupedListItemHover)?.separatorHidden,
  };
}

// A list's neighbours learn of this row's hover and press, beside the caller's own handlers.
function useHoverLink(props: GroupedListItemProps): GroupedListItemProps {
  const hover = useContext(GroupedListItemHover);

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

function useRowProps(props: GroupedListItemProps): ReturnType<
  typeof selectionProps
> & {
  accessibilityLabel: string;
  className: string;
} {
  const sidebar = useSidebarList();

  return {
    accessibilityLabel: groupedListItemName(props),
    ...selectionProps(props),
    className: rowClasses(props, sidebar, useRowPlace()),
  };
}

interface PressableRowProps extends React.ComponentProps<typeof View> {
  item: GroupedListItemProps;
  press: () => void;
}

function PressableRow(props: PressableRowProps): React.JSX.Element {
  const { item, press, children, ...rowProps } = props;

  return (
    <Pressable
      {...linkProps(item)}
      {...rowProps}
      {...interactionProps(item, press)}
      {...usePressingLink()}
    >
      {children}
    </Pressable>
  );
}

function usePressingLink(): Pick<
  React.ComponentProps<typeof Pressable>,
  'onPressIn' | 'onPressOut'
> {
  const hover = useContext(GroupedListItemHover);

  if (!hover) return {};

  return {
    onPressIn: () => hover.onPressing(true),
    onPressOut: () => hover.onPressing(false),
  };
}

GroupedListItem satisfies React.ComponentType<GroupedListItemProps>;
