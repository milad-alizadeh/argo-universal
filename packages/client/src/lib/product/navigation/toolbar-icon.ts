import { overflowIcon } from '@repo/kit/primitives/actions/action';
import { type IconName, iconSymbols } from '@repo/kit/symbols/icon-names';
import {
  type DrawnMaterialName,
  namedMaterialImage,
} from '@repo/kit/symbols/material-images/material-images';
import type { ImageSourcePropType } from 'react-native';
import type { SFSymbol } from 'sf-symbols-typescript';

// The Argo icons a native header toolbar can show: a system SF Symbol on iOS, and on Android, which takes an image, a Material drawing.
export type ToolbarIconName = {
  [Name in IconName]: (typeof iconSymbols)[Name] extends {
    sf: SFSymbol;
    material: DrawnMaterialName;
  }
    ? Name
    : never;
}[IconName];

type ToolbarIcon =
  | (typeof iconSymbols)[ToolbarIconName]['sf']
  | ImageSourcePropType;

// Android's header overflow is the vertical ⋯, where the shared table's `more_horiz` serves in-page buttons.
const androidMaterial = (name: ToolbarIconName): DrawnMaterialName =>
  name === 'more' ? overflowIcon.material : iconSymbols[name].material;

// A Stack.Toolbar item's `icon`: the shared table's SF Symbol on iOS, its Material drawing on Android.
export function toolbarIcon(name: ToolbarIconName): ToolbarIcon {
  return process.env.EXPO_OS === 'ios'
    ? iconSymbols[name].sf
    : namedMaterialImage(androidMaterial(name));
}
