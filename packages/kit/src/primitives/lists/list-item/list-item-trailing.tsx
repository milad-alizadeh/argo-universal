import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/content/text';
import { useListLook } from '../../../list-look-context';
import { sidebarStatus } from '../../../row-badge';
import { cn } from '../../../utils';
import { InertLane, useOpenLane } from './list-item-pass-through';
import type { ListItemProps } from './list-item-props';

type TrailingProps = Pick<
  ListItemProps,
  'trailing' | 'value' | 'badge' | 'valueTone' | 'trailingAccessories'
>;

function trailingContent(props: TrailingProps): ReactNode {
  return props.value === undefined ? (
    props.trailing
  ) : (
    <View className="flex-row items-center gap-1.5">
      <Text role="row" tone={props.valueTone ?? 'muted'}>
        {props.value}
      </Text>
      {props.trailing}
    </View>
  );
}

function useTrailingContent(props: TrailingProps): ReactNode {
  const content = trailingContent(props);
  const status = useListLook().sidebar ? sidebarStatus(props.badge) : undefined;

  if (status === undefined) return content;

  return (
    <View className="flex-row items-center gap-3">
      {content}
      {status}
    </View>
  );
}

// Trailing accessories follow the trailing items and give up their width before the title does.
const trailingClass = (accessories: ReactNode): string =>
  cn(
    'h-6 wide-type:h-5 flex-row items-center justify-end gap-1',
    accessories === undefined ? 'shrink-0' : 'min-w-0 shrink',
  );

export function Trailing(props: TrailingProps): ReactNode {
  const content = useTrailingContent(props);
  const open = useOpenLane();
  const accessories = props.trailingAccessories;

  if (content === undefined && accessories === undefined) return null;

  return (
    <View {...open} className={trailingClass(accessories)}>
      <InertLane className="shrink-0 flex-row items-center gap-1">
        {content}
      </InertLane>
      {accessories}
    </View>
  );
}
