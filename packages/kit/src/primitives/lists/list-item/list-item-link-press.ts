import type { PressableProps } from 'react-native';
import type { ListItemProps } from './list-item-props';

function modified(event: { nativeEvent: unknown }): boolean {
  const click = event.nativeEvent;

  if (typeof MouseEvent === 'undefined' || !(click instanceof MouseEvent))
    return false;

  return [
    click.metaKey,
    click.ctrlKey,
    click.shiftKey,
    click.altKey,
    click.button,
  ].some(Boolean);
}

export function linkPress(props: ListItemProps): PressableProps['onPress'] {
  if (!props.onPress) return undefined;

  return (event) => {
    if (modified(event)) return;
    event.preventDefault();
    props.onPress?.();
  };
}
