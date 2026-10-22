import type { ImageSourcePropType } from 'react-native';
import { materialFilledImages, materialImages } from './material-images.gen';

export type DrawnMaterialName = keyof typeof materialImages;

const images: ReadonlyMap<string, ImageSourcePropType> = new Map(
  Object.entries(materialImages),
);

// A Material name's XML drawing, for Expo UI's Icon on Android; none for a name @expo/material-symbols lacks.
export function materialImage(name: string): ImageSourcePropType | undefined {
  return images.get(name);
}

const filledImages: ReadonlyMap<string, ImageSourcePropType> = new Map(
  Object.entries(materialFilledImages),
);

// A Material name's filled XML drawing; none for a name outside Argo's map.
export function materialFilledImage(
  name: string,
): ImageSourcePropType | undefined {
  return filledImages.get(name);
}

// A Material name's drawing, where the type has already proved there is one, as a header toolbar's items need.
export const namedMaterialImage = (
  name: DrawnMaterialName,
): ImageSourcePropType => materialImages[name];
