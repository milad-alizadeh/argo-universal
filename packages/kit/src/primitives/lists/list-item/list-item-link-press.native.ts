import { router } from 'expo-router';
import type { PressableProps } from 'react-native';
import type { ListItemProps } from './list-item-props';

export function linkPress(props: ListItemProps): PressableProps['onPress'] {
  if (props.onPress) return props.onPress;
  const href = props.href;

  return href ? () => router.navigate(href) : undefined;
}
