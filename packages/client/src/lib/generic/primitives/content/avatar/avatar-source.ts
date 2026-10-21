import type { ImageSourcePropType } from 'react-native';

export function avatarSource(source: string | number): ImageSourcePropType {
  return typeof source === 'number' ? source : { uri: source };
}
