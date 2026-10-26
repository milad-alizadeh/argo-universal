import type { ReactElement, ReactNode } from 'react';
import { HeadingInsetContext } from '#kit/heading-inset';
import { ScrollColumnContext } from '#kit/scroll-column';
import { InsideHostContext } from '#primitives/native/host';

/*
 * What a sheet page holds is React Native again, and a page of its own. A sheet opened from inside a FieldGroup's
 * native tree (a Picker's `page`) draws its presentation straight into that tree, whose kit Hosts must draw trees of
 * their own. The sheet is a surface of its own too, as a popover is, so the pane's column behind it (a wide window's
 * width and padding) never shapes a page's rows, and a FieldGroup on a page never tells the Screen behind it that it
 * holds grouped cards: a page's FieldGroup draws as it does on a Settings Screen.
 */
export function ReactContent(props: { children: ReactNode }): ReactElement {
  return (
    <InsideHostContext.Provider value={false}>
      <ScrollColumnContext value={undefined}>
        <HeadingInsetContext value={undefined}>
          {props.children}
        </HeadingInsetContext>
      </ScrollColumnContext>
    </InsideHostContext.Provider>
  );
}
