import ArrowRight from '@expo/material-symbols/arrow_right.xml';
import { DropdownMenuItem, Icon, Row, Text } from '@expo/ui/jetpack-compose';
import type * as React from 'react';
import { useMaterialPalette } from '#primitives/native/material-palette';
import { useItemColors } from './menu-item-colors.android';
import { ItemLeadingIcon } from './menu-item-icon.android';
import type { NativeMenuItem } from './menu-native-items';

type SubmenuRowProps = { item: NativeMenuItem; onOpen: () => void };

// The row that opens a nested menu: Material's trailing arrow marks it, after the count of a submenu's count badge.
export function SubmenuRow(props: SubmenuRowProps): React.JSX.Element {
  const { item, onOpen } = props;

  return (
    <DropdownMenuItem elementColors={useItemColors(item)} onClick={onOpen}>
      <ItemLeadingIcon {...item} onPress={onOpen} />
      <DropdownMenuItem.Text>
        <Text>{item.title}</Text>
      </DropdownMenuItem.Text>
      <DropdownMenuItem.TrailingIcon>
        <SubmenuTrailing count={item.count} />
      </DropdownMenuItem.TrailingIcon>
    </DropdownMenuItem>
  );
}

// Material's menu item spaces its label, icons and trailing text 12dp apart.
const trailingArrangement = { spacedBy: 12 };

function SubmenuTrailing({ count }: { count?: string }): React.JSX.Element {
  const muted = useMaterialPalette().roles.onSurfaceVariant;

  return (
    <Row verticalAlignment="center" horizontalArrangement={trailingArrangement}>
      {count ? <Text color={muted}>{count}</Text> : null}
      <Icon source={ArrowRight} />
    </Row>
  );
}
