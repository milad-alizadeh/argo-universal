import { Platform } from 'react-native';
import type { ListItemProps } from './list-item-props';

// The kit places values and row descriptions according to the platform's settings conventions.
export function placedContent<
  Props extends Pick<ListItemProps, 'subtitle' | 'description'>,
>(props: Props & { value?: string }): Props & { value?: string } {
  if (Platform.OS !== 'android') return props;

  return {
    ...props,
    value: undefined,
    subtitle:
      [props.subtitle, props.value, props.description]
        .filter(Boolean)
        .join('\n') || undefined,
  };
}
