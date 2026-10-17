import AddIcon from '@expo/material-symbols/add.xml';
import Archive from '@expo/material-symbols/archive.xml';
import Edit from '@expo/material-symbols/edit.xml';
import EditSquare from '@expo/material-symbols/edit_square.xml';
import FilterList from '@expo/material-symbols/filter_list.xml';
import MoreVert from '@expo/material-symbols/more_vert.xml';
import Search from '@expo/material-symbols/search.xml';
import Tune from '@expo/material-symbols/tune.xml';
import type { ImageSourcePropType } from 'react-native';
import { iconSymbols } from '#lib/generic/symbols/icon-names';

// The Material drawings a native header toolbar shows on Android: Stack.Toolbar takes an image there, so each icon it uses is bundled here. iOS takes the SF name from the shared icon table.
const materialImages = {
  add: AddIcon,
  search: Search,
  'filter-list': FilterList,
  filters: Tune,
  'new-session': EditSquare,
  // Android's header overflow is the vertical ⋯, where the shared table's `more_horiz` serves in-page buttons.
  more: MoreVert,
  rename: Edit,
  archive: Archive,
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
