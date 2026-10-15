import AddIcon from '@expo/material-symbols/add.xml';
import FilterList from '@expo/material-symbols/filter_list.xml';
import Tune from '@expo/material-symbols/tune.xml';
import type { ImageSourcePropType } from 'react-native';
import { iconSymbols } from '#lib/generic/symbols/icon-names';

// The Material drawings a native header toolbar shows on Android: Stack.Toolbar takes an image there, so each icon it uses is bundled here. iOS takes the SF name from the shared icon table.
const materialImages = {
  add: AddIcon,
  'filter-list': FilterList,
  filters: Tune,
} satisfies Partial<Record<keyof typeof iconSymbols, ImageSourcePropType>>;

export type ToolbarIconName = keyof typeof materialImages;

type ToolbarIcon =
  | (typeof iconSymbols)[ToolbarIconName]['sf']
  | ImageSourcePropType;

// A Stack.Toolbar item's `icon`: the shared table's SF Symbol on iOS, its Material image on Android.
export function toolbarIcon(name: ToolbarIconName): ToolbarIcon {
  return process.env.EXPO_OS === 'ios'
    ? iconSymbols[name].sf
    : materialImages[name];
}
