import { Platform } from 'react-native';
import type { ListItemProps } from './list-item-props';

type Placed = Pick<ListItemProps, 'subtitle' | 'description'> & {
  value?: string;
};

// A row's content once placed: Android's value under a subtitle makes the subtitle two lines, both shown.
export type PlacedContentProps = ListItemProps & { subtitleWraps?: boolean };

const joined = (lines: (string | undefined)[]): string | undefined =>
  lines.filter(Boolean).join('\n') || undefined;

/*
 * The kit places values and row descriptions according to the platform's settings conventions: Android puts both
 * under the title, desktop and web put the description there and keep the value trailing, and iOS keeps both where
 * they are, the description drawing as the footer that ends the row's group.
 */
export function placedContent<Props extends Placed>(
  props: Props,
): Props & { subtitleWraps?: boolean } {
  if (Platform.OS === 'android')
    return {
      ...props,
      value: undefined,
      subtitleWraps: [props.subtitle, props.value].every(Boolean),
      subtitle: joined([props.subtitle, props.value, props.description]),
    };

  if (Platform.OS === 'web')
    return { ...props, subtitle: joined([props.subtitle, props.description]) };

  return props;
}
