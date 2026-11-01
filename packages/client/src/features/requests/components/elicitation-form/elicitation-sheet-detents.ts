import type { SheetProps } from '@repo/kit/primitives/overlays/sheet';
import type { PlatformOSType } from 'react-native';

export type SheetLayout = Pick<
  SheetProps,
  'detents' | 'initialDetent' | 'contentScrolls'
>;

/*
 * The fields' FieldGroup scrolls its own rows and fills the sheet on iOS (SwiftUI's Form, at the system heights) and
 * Android (a LazyColumn); elsewhere the sheet fits them.
 * iOS opens large: under the heading and the footer's two buttons, medium leaves room for about one
 * option and the custom answer, and SwiftUI grows a sheet only on the first upward scroll, so no
 * answer may wait below medium. The person may still drag the sheet down to medium.
 * Android's sheet fills the window only when it names a height; with none it wraps its content, and a LazyColumn
 * that fills a wrapped sheet is zero tall, which drew the question and its buttons with no option (#1676). Material's
 * half-open stop would cut the footer, so Android rests only at its full height, as a Dialog's fields sheet does.
 */
export function elicitationSheetLayout(os: PlatformOSType): SheetLayout {
  if (os === 'ios') {
    return {
      detents: ['medium', 'large'],
      initialDetent: 'large',
      contentScrolls: true,
    };
  }

  if (os === 'android') return { detents: ['large'], contentScrolls: true };

  return {};
}
