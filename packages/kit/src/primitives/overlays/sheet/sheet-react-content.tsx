import type { ReactElement, ReactNode } from 'react';
import { OutsideColumn } from '#kit/content-column/content-column';
import { InsideHostContext } from '#primitives/native/host';
import { ScreenNavigationEnabled } from '#primitives/scaffolds/screen';

/*
 * What a sheet page holds is React Native again, and a page of its own. A sheet opened from inside a FieldGroup's
 * native tree (a Picker's `page`) draws its presentation straight into that tree, whose kit Hosts must draw trees of
 * their own. The sheet is a surface of its own too, as a popover is, so the pane's column behind it (a wide window's
 * width and padding) never shapes a page's rows, and a FieldGroup on a page never tells the Screen behind it that it
 * holds grouped cards: a page's FieldGroup draws as it does on a Settings Screen. A Screen on a page is no entry of the
 * navigator the sheet opened over, so it never sets that stack's header: the Session's stays behind the sheet.
 */
export function ReactContent(props: { children: ReactNode }): ReactElement {
  return (
    <InsideHostContext.Provider value={false}>
      <ScreenNavigationEnabled value={false}>
        <OutsideColumn>{props.children}</OutsideColumn>
      </ScreenNavigationEnabled>
    </InsideHostContext.Provider>
  );
}
