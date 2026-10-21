import { Platform } from 'react-native';
import type { ScrollFadeViewProps } from '../../../scroll-fade/scroll-fade';

type NativeIntent = Pick<
  ScrollFadeViewProps,
  'onTouchStart' | 'onScrollBeginDrag' | 'onPointerDown'
>;

type WebIntent = {
  onWheel?: () => void;
  onKeyDown?: (event: { key: string }) => void;
};

const scrollKeys = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'PageUp',
  'PageDown',
  'Home',
  'End',
  ' ',
]);

export function inspectorScrollIntent(
  cancel: () => void,
): NativeIntent & WebIntent {
  return {
    ...webIntent(cancel),
    onTouchStart: cancel,
    onScrollBeginDrag: cancel,
    onPointerDown: cancel,
  };
}

const webIntent = (cancel: () => void): WebIntent =>
  Platform.OS === 'web'
    ? {
        onWheel: cancel,
        onKeyDown: (event) => {
          if (scrollKeys.has(event.key)) cancel();
        },
      }
    : {};
