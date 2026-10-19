import type { ImageSourcePropType } from 'react-native';
import expandMore from '../assets/expand-more.xml';
import { iconSymbols } from '../icon-names';
import { type IconSymbol, resolveIcon } from '../icon-symbol';
import { materialImagesAE } from './material-images-a-e';
import { materialImagesFO } from './material-images-f-o';
import { materialImagesPZ } from './material-images-p-z';

type MaterialName<Source> = Source extends { material: infer Name }
  ? Name
  : never;

type ArgoMaterialName = MaterialName<
  (typeof iconSymbols)[keyof typeof iconSymbols]
>;

// The Material names Argo's icons use that @expo/material-symbols 0.1.1 has no drawing for; those icons stay hosted from React Native.
type UndrawnMaterialName =
  | 'auto_awesome'
  | 'expand_less'
  | 'feed'
  | 'smartphone';

/*
 * Every Material drawing an Argo icon has, by Material name, so the one icon table (`iconSymbols`) still decides
 * which Material name an Argo icon draws. `more_vert` is the header overflow's (`overflowIcon`); `expand_more` is
 * Argo's own asset (assets/README.md).
 */
const materialImages = {
  ...materialImagesAE,
  ...materialImagesFO,
  ...materialImagesPZ,
  expand_more: expandMore,
} satisfies Record<
  Exclude<ArgoMaterialName, UndrawnMaterialName> | 'more_vert',
  ImageSourcePropType
>;

export type DrawnMaterialName = keyof typeof materialImages;

const images: ReadonlyMap<string, ImageSourcePropType> = new Map(
  Object.entries(materialImages),
);

/*
 * An icon's Material XML drawing, for a stock Compose `Icon` (as Expo Router's Android toolbar draws one); none for a
 * Tabler icon or a Material name without one.
 */
export function materialImage(
  icon: IconSymbol,
): ImageSourcePropType | undefined {
  const { symbol } = resolveIcon(icon);

  return 'material' in symbol ? images.get(symbol.material) : undefined;
}

// A Material name's drawing, where the type has already proved there is one, as a header toolbar's items need.
export const namedMaterialImage = (
  name: DrawnMaterialName,
): ImageSourcePropType => materialImages[name];
