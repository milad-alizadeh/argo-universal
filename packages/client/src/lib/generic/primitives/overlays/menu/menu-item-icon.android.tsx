import Archive from '@expo/material-symbols/archive.xml';
import Inbox from '@expo/material-symbols/inbox.xml';
import ViewAgenda from '@expo/material-symbols/view_agenda.xml';
import ViewList from '@expo/material-symbols/view_list.xml';
import { DropdownMenuItem, Icon } from '@expo/ui/jetpack-compose';
import type { AndroidSymbol } from 'expo-symbols';
import type * as React from 'react';
import type { ImageSourcePropType } from 'react-native';
import { drawnSymbol } from '../../../symbols/drawn-symbol';
import { type IconName, iconSymbols } from '../../../symbols/icon-names';

// Compose's Icon draws a bundled vector drawable, so each Material symbol a menu row shows is imported here; a symbol not listed draws no icon.
const materialImages: Partial<Record<AndroidSymbol, ImageSourcePropType>> = {
  archive: Archive,
  inbox: Inbox,
  view_agenda: ViewAgenda,
  view_list: ViewList,
};

function materialImage(icon?: IconName): ImageSourcePropType | undefined {
  if (!icon) return undefined;
  const symbol = drawnSymbol(iconSymbols[icon]);

  return symbol.kind === 'system' ? materialImages[symbol.material] : undefined;
}

// Material's leading icon, at its 24dp size; it takes the item's leading icon colour.
export function ItemLeadingIcon(props: {
  icon?: IconName;
}): React.JSX.Element | null {
  const source = materialImage(props.icon);

  if (!source) return null;

  return (
    <DropdownMenuItem.LeadingIcon>
      <Icon source={source} />
    </DropdownMenuItem.LeadingIcon>
  );
}
